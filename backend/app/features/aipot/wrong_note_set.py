"""Build the first personal AI-POT wrong-answer note set from submitted work.

This deliberately uses only the six user-selected source sets and only the
newest submitted attempt for each source.  It is intentionally deterministic:
the curated fact bank is reviewed source material, not generated content.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

TARGET_EXAMS = (
    "public-set-a",
    "public-set-b",
    "source-round-01",
    "source-round-02",
    "source-round-03",
    "source-round-04",
)
OUTPUT_ID = "sample-set-01"
REUSABLE_SOURCE_TYPES = frozenset({"multiple_choice", "choice_bank"})


@dataclass(frozen=True)
class Fact:
    exam_id: str
    number: int
    chapter: str
    topic: str
    stem: str
    answer: str
    options: tuple[str, str, str, str]
    reasons: dict[str, str]
    aliases: tuple[str, ...] = ()
    count: int = 4
    short_answer: bool = True
    stems: tuple[str, ...] = ()


def _reasons(answer: str, contrasts: dict[str, str], cue: str) -> dict[str, str]:
    return {
        answer: f"{answer}은(는) {cue}를 뜻하므로 조건과 일치한다.",
        **{
            choice: f"{choice}은(는) {reason}이므로 {cue}를 뜻하지 않는다."
            for choice, reason in contrasts.items()
        },
    }


# Each fact is traced to one answered-but-missed source question.  Public A
# Q38 is purposefully absent: its stored partial-score criterion conflicts
# with its source prompt/reference answer, so it cannot be reused as evidence.
FACTS = (
    Fact(
        "public-set-a",
        25,
        "C09",
        "교차검증",
        "데이터를 K개로 나누고 매번 한 묶음만 검증에 쓰며 K번 평가한다.",
        "k-fold cross validation",
        ("k-fold cross validation", "holdout", "bootstrap", "LOOCV"),
        _reasons(
            "k-fold cross validation",
            {
                "holdout": "한 번만 분리하는 방식",
                "bootstrap": "복원추출 표본화",
                "LOOCV": "한 샘플만 검증에 쓰는 특수 경우",
            },
            "K개 폴드 순환 검증",
        ),
        (
            "k-fold cross-validation",
            "k fold cross validation",
            "k-fold 교차검증",
            "k-폴드 교차검증",
        ),
        2,
    ),
    Fact(
        "public-set-a",
        27,
        "C11",
        "분포 시각화",
        "연령대를 구간으로 묶어 각 구간의 비율을 차트로 표현한다.",
        "distribution visualization",
        ("distribution visualization", "산점도", "회귀 분석", "데이터 정제"),
        _reasons(
            "distribution visualization",
            {
                "산점도": "두 수치 변수의 관계를 보는 그래프",
                "회귀 분석": "예측 관계를 모델링하는 방법",
                "데이터 정제": "분석 전 오류를 고치는 과정",
            },
            "값의 빈도·비율 분포 표현",
        ),
        ("분포 시각화",),
        2,
    ),
    Fact(
        "public-set-a",
        28,
        "C12",
        "Zero-shot CoT",
        "예시를 주지 않고 ‘단계별로 생각해 보자’라는 추론 지시만 넣는다.",
        "zero-shot cot",
        ("zero-shot cot", "few-shot cot", "RAG", "파인튜닝"),
        _reasons(
            "zero-shot cot",
            {
                "few-shot cot": "풀이 예시를 함께 제공하는 방식",
                "RAG": "검색 문서를 근거로 넣는 방식",
                "파인튜닝": "모델 파라미터를 추가 학습하는 방식",
            },
            "예시 없는 단계적 추론 유도",
        ),
        ("zero shot cot", "제로샷 cot"),
        3,
    ),
    Fact(
        "public-set-a",
        29,
        "C13",
        "데이터 정제",
        "원시 데이터를 분석에 쓰기 좋게 오류·결측·형식을 고친다.",
        "data cleaning",
        ("data cleaning", "데이터 수집", "데이터 시각화", "모델 배포"),
        _reasons(
            "data cleaning",
            {
                "데이터 수집": "원천 데이터를 확보하는 단계",
                "데이터 시각화": "데이터를 그래프로 표현하는 단계",
                "모델 배포": "완성 모델을 서비스에 적용하는 단계",
            },
            "원시 데이터의 오류·형식 보정",
        ),
        ("데이터 정제",),
        2,
    ),
    Fact(
        "public-set-a",
        31,
        "C15",
        "텍스트-영상 생성",
        "텍스트 프롬프트만으로 새 영상 장면을 생성한다.",
        "txt2vid",
        ("txt2vid", "img2vid", "vid2vid", "word2vec"),
        _reasons(
            "txt2vid",
            {
                "img2vid": "이미지를 입력으로 영상을 만드는 방식",
                "vid2vid": "기존 영상을 변환하는 방식",
                "word2vec": "단어 벡터 표현 기법",
            },
            "텍스트에서 영상으로의 생성",
        ),
        ("txt2vid",),
        4,
        stems=(
            "텍스트 프롬프트만 입력해 새 영상 장면을 만든다.",
            "이미지나 기존 영상 없이 문장 하나로 영상 클립을 생성한다.",
            "입력이 서면 장면 설명이고 출력이 움직이는 영상인 생성 방식이다.",
            "‘비 오는 거리의 5초 장면’이라는 글만으로 영상을 만든다.",
        ),
    ),
    Fact(
        "public-set-a",
        37,
        "C17",
        "영문 이미지 프롬프트",
        "흑백 1:1 사진의 모자 쓴 남성·책·강아지·벽의 H 그림을 한 문장 영어로 지시한다.",
        "한 문장 영어 프롬프트",
        ("한 문장 영어 프롬프트", "한국어 목록", "두 문장 설명", "이미지 파일명"),
        _reasons(
            "한 문장 영어 프롬프트",
            {
                "한국어 목록": "영문 한 문장 조건을 충족하지 못함",
                "두 문장 설명": "한 문장 조건을 충족하지 못함",
                "이미지 파일명": "장면 특징을 지시하지 못함",
            },
            "영문 한 문장·흑백 스타일·핵심 특징 반영",
        ),
        ("one-sentence English prompt",),
        2,
    ),
    Fact(
        "public-set-b",
        26,
        "C04",
        "변이형 오토인코더(VAE)",
        "입력을 잠재 표현으로 압축하고 그 표현으로 새 콘텐츠를 생성하는 오토인코더 계열 모델이다.",
        "vae",
        ("vae", "GAN", "CNN", "K-means"),
        _reasons(
            "vae",
            {
                "GAN": "생성자·판별자 구조의 생성 모델",
                "CNN": "합성곱 신경망 구조",
                "K-means": "비지도 군집화 방법",
            },
            "잠재 표현 기반 생성·복원",
        ),
        ("variational autoencoder", "변이형 자동 인코더", "변이형 자동인코더"),
        2,
    ),
    Fact(
        "public-set-b",
        28,
        "C14",
        "결측치 처리",
        "일부 열의 값이 비어 있어 평균 대치나 행 삭제를 검토하는 데이터 정제 작업이다.",
        "missing value",
        ("missing value", "표준화", "군집화", "시각화"),
        _reasons(
            "missing value",
            {
                "표준화": "변수의 스케일을 맞추는 처리",
                "군집화": "비슷한 데이터를 묶는 분석",
                "시각화": "데이터를 표현하는 단계",
            },
            "비어 있는 값의 처리",
        ),
        ("결측치 처리", "결측값"),
        2,
    ),
    Fact(
        "source-round-02",
        2,
        "C02",
        "딥러닝 역사",
        "2016년 AlphaGo가 인간을 이긴 게임은 장기가 아니라 바둑이다.",
        "바둑",
        ("바둑", "장기", "체스", "오델로"),
        _reasons(
            "바둑",
            {
                "장기": "AlphaGo의 2016년 대결 종목이 아님",
                "체스": "Deep Blue와 관련된 종목",
                "오델로": "해당 사건의 종목이 아님",
            },
            "AlphaGo의 2016년 인간 승리 종목",
        ),
        ("바둑", "Go"),
        4,
        stems=(
            "2016년 AlphaGo가 인간 정상급 기사와 대결한 게임 종목이다.",
            "AlphaGo의 이세돌 대국으로 널리 알려진 보드게임을 쓰시오.",
            "AlphaGo가 2016년 인간을 이긴 사건은 체스가 아닌 이 게임과 관련된다.",
            "흑돌과 백돌을 바둑판에 두는 AlphaGo의 대결 종목이다.",
        ),
    ),
    Fact(
        "source-round-02",
        9,
        "C06",
        "파운데이션 모델",
        "대규모 데이터로 미리 학습한 뒤 여러 과업에 전이·적응할 수 있는 모델이다.",
        "파운데이션 모델",
        ("파운데이션 모델", "규칙 기반 시스템", "단일 과업 모델", "데이터베이스"),
        _reasons(
            "파운데이션 모델",
            {
                "규칙 기반 시스템": "사전학습 모델의 전이 특성이 없음",
                "단일 과업 모델": "여러 과업 적응이라는 조건과 다름",
                "데이터베이스": "모델이 아니라 데이터 저장소",
            },
            "대규모 사전학습 후 다목적 적응",
        ),
        ("foundation model",),
        4,
        stems=(
            "대규모 데이터로 사전학습한 뒤 번역·요약 등 여러 과업에 적응한다.",
            "한 과업을 처음부터 매번 학습하지 않고, 넓은 사전학습 지식을 전이한다.",
            "다목적 활용을 위해 거대한 일반 데이터로 먼저 학습하는 모델 계열이다.",
            "후속 작업별 미세조정이나 프롬프트 적응의 기반이 되는 사전학습 모델이다.",
        ),
    ),
    Fact(
        "source-round-02",
        33,
        "C11",
        "ComfyUI 시드",
        "ComfyUI에서 새 시드를 만들어 기존 생성 결과와 다른 변형을 얻도록 하는 기능이다.",
        "시드 무작위 재설정",
        ("시드 무작위 재설정", "시드 고정", "해상도 변경", "모델 교체"),
        _reasons(
            "시드 무작위 재설정",
            {
                "시드 고정": "같은 난수 시작값을 유지하는 설정",
                "해상도 변경": "출력 크기를 바꾸는 설정",
                "모델 교체": "생성 모델을 바꾸는 작업",
            },
            "새 시드로 결과 변형 생성",
        ),
        ("시드 무작위 재설정",),
        4,
        stems=(
            "같은 프롬프트에서 새 난수 시작값으로 다른 이미지를 얻는다.",
            "생성 결과의 구도 변형을 위해 고정된 난수 값을 새 값으로 바꾼다.",
            "ComfyUI에서 이전 결과와 다른 변형을 만들기 위해 시드를 새로 뽑는다.",
            "프롬프트는 유지하고 매 실행의 초기 난수를 바꾸는 설정이다.",
        ),
    ),
    Fact(
        "source-round-03",
        31,
        "C14",
        "NotebookLM AI 오디오 오버뷰",
        "소스 내용을 두 AI 진행자의 대화형 오디오로 만드는 NotebookLM 기능이다.",
        "AI 오디오 오버뷰",
        ("AI 오디오 오버뷰", "보고서", "슬라이드 자료", "인포그래픽"),
        _reasons(
            "AI 오디오 오버뷰",
            {
                "보고서": "문서 형태의 요약 기능",
                "슬라이드 자료": "발표 자료 생성 기능",
                "인포그래픽": "시각 요약 이미지 기능",
            },
            "두 AI 진행자의 대화형 오디오 생성",
        ),
        ("AI 오디오 오버뷰",),
        2,
    ),
    Fact(
        "source-round-04",
        1,
        "C01",
        "AI 역사",
        "1980년대 전략 컴퓨팅 투자와 역전파로 연결주의가 부활한 시기다.",
        "2차 AI 부흥",
        ("2차 AI 부흥", "1차 AI 겨울", "2차 AI 겨울", "딥러닝 혁명"),
        _reasons(
            "2차 AI 부흥",
            {
                "1차 AI 겨울": "1970년대 연구비 축소 시기",
                "2차 AI 겨울": "1980년대 말 침체 시기",
                "딥러닝 혁명": "2006년 이후의 시기",
            },
            "1980년대 전략 컴퓨팅·역전파 부활",
        ),
        ("2차 AI 부흥",),
        4,
        stems=(
            "1980년대 전략 컴퓨팅 투자와 전문가 시스템 확산으로 AI 연구가 다시 활발해진 시기다.",
            "역전파 학습의 재조명으로 연결주의 연구가 되살아난 1980년대 AI 흐름이다.",
            "1차 AI 겨울 뒤, 일본의 5세대 컴퓨터 계획 등이 연구 투자를 이끈 시기다.",
            "1980년대 중반 전문가 시스템과 신경망 연구가 성장한 AI 역사 단계다.",
        ),
    ),
    Fact(
        "source-round-04",
        2,
        "C02",
        "에이전트 AI",
        "목표를 받은 뒤 스스로 계획하고, 결과에 맞춰 전략을 고치며, 여러 도구를 연결해 실행한다.",
        "에이전트 AI",
        ("에이전트 AI", "일반 챗봇", "검색 엔진", "스프레드시트"),
        _reasons(
            "에이전트 AI",
            {
                "일반 챗봇": "보통 새 사용자 입력을 기다리는 응답형 도구",
                "검색 엔진": "정보 검색 기능만 수행",
                "스프레드시트": "표 계산 도구",
            },
            "자율 계획·재계획·도구 실행",
        ),
        ("에이전트 AI",),
        4,
        stems=(
            "목표를 받은 뒤 할 일을 나누고 도구를 호출해 결과를 수행한다.",
            "검색 결과가 부족하면 계획을 수정한 뒤 다른 도구를 이어서 실행한다.",
            "사용자 목표를 향해 계획·실행·관찰·재계획을 반복하는 AI다.",
            "질문에 한 번 답하는 데서 그치지 않고 외부 도구를 조합해 작업을 완료한다.",
        ),
    ),
    Fact(
        "source-round-04",
        4,
        "C04",
        "랜덤 포레스트",
        "독립 트리를 배깅으로 학습해 다수결 또는 평균으로 합친다.",
        "랜덤 포레스트",
        ("랜덤 포레스트", "부스팅", "선형 회귀", "K-평균"),
        _reasons(
            "랜덤 포레스트",
            {
                "부스팅": "이전 오차를 순차 보정하는 방식",
                "선형 회귀": "트리 앙상블이 아님",
                "K-평균": "비지도 군집화 방법",
            },
            "독립 트리 배깅과 투표·평균",
        ),
        ("랜덤 포레스트",),
        4,
        stems=(
            "여러 결정트리를 서로 다른 표본으로 독립 학습해 다수결로 예측한다.",
            "부트스트랩 표본마다 트리를 만들고 평균 또는 투표로 결합하는 앙상블이다.",
            "이전 모델의 잔차를 순차 보정하지 않고, 병렬적인 트리 집합을 사용한다.",
            "특성 일부를 무작위로 골라 만든 다수 트리의 결과를 합친다.",
        ),
    ),
    Fact(
        "source-round-04",
        5,
        "C05",
        "AI 생명주기",
        "결측값을 중앙값으로 바꾸는 작업은 데이터 수집 및 전처리 단계다.",
        "데이터 수집 및 전처리",
        ("데이터 수집 및 전처리", "문제 정의", "모델 배포", "성능 모니터링"),
        _reasons(
            "데이터 수집 및 전처리",
            {
                "문제 정의": "목표를 정하는 초기 단계",
                "모델 배포": "완성 모델을 서비스에 적용하는 단계",
                "성능 모니터링": "배포 후 지표를 추적하는 단계",
            },
            "결측값·형식 보정",
        ),
        ("데이터 수집 및 전처리",),
        4,
        stems=(
            "비어 있는 값을 중앙값으로 채운 뒤 모델 학습용 표를 준비한다.",
            "중복 행·결측값·형식 오류를 고쳐 학습 데이터를 정돈하는 생명주기 단계다.",
            "원천 데이터를 모은 후 분석 가능한 형태로 정제하는 단계다.",
            "학습 전에 날짜 형식을 통일하고 이상치를 처리하는 작업이 속하는 단계다.",
        ),
    ),
    Fact(
        "source-round-04",
        6,
        "C06",
        "Azure 서비스",
        "대용량 비정형 파일을 저장하는 Azure 객체 스토리지다.",
        "Azure Blob Storage",
        ("Azure Blob Storage", "Azure CDN", "Azure SQL Database", "Azure Monitor"),
        _reasons(
            "Azure Blob Storage",
            {
                "Azure CDN": "정적 콘텐츠 전송을 가속하는 서비스",
                "Azure SQL Database": "관리형 관계형 데이터베이스",
                "Azure Monitor": "관측·모니터링 서비스",
            },
            "비정형 대용량 객체 저장",
        ),
        ("Azure Blob Storage", "Blob Storage"),
        4,
        stems=(
            "대용량 이미지·동영상 같은 비정형 객체 파일을 저장하는 Azure 서비스다.",
            "관계형 테이블이 아니라 파일 객체 자체를 클라우드에 보관한다.",
            "사진 원본과 로그 파일을 컨테이너 단위로 저장하는 Azure 스토리지다.",
            "정적 파일을 원본 형태로 저장하며 CDN 전송 가속과는 역할이 다르다.",
        ),
    ),
    Fact(
        "source-round-04",
        8,
        "C08",
        "AI 프레임워크",
        "TensorFlow의 TPU 활용을 단순 로지스틱 회귀에 ‘최적’이라고 단정하는 진술은 부적절하다.",
        "로지스틱 회귀에 최적",
        (
            "로지스틱 회귀에 최적",
            "K-means에 Scikit-learn",
            "랜덤 포레스트 제공",
            "TensorFlow Lite 배포",
        ),
        _reasons(
            "로지스틱 회귀에 최적",
            {
                "K-means에 Scikit-learn": "군집화 라이브러리 활용으로 타당함",
                "랜덤 포레스트 제공": "Scikit-learn의 정상 기능",
                "TensorFlow Lite 배포": "모바일 배포 용도로 타당함",
            },
            "TensorFlow·TPU의 과도한 단정",
        ),
        ("로지스틱 회귀에 최적",),
        4,
        short_answer=False,
        stems=(
            "단순 로지스틱 회귀에 TensorFlow TPU가 ‘최적’이라고 단정하는 진술은 부적절하다.",
            "작은 선형 분류 문제에 대규모 TPU가 반드시 최선이라는 주장은 과도하다.",
            "TensorFlow·TPU의 활용 가능성과 단순 회귀에 대한 최적성 주장을 구별해야 한다.",
            "모든 로지스틱 회귀에 TPU가 최적이라는 설명에서 부적절한 부분을 고르시오.",
        ),
    ),
    Fact(
        "source-round-04",
        20,
        "C20",
        "Shot prompting",
        "예시 없이 작업 지시만 주는 방식은 zero-shot prompting이다.",
        "zero-shot prompting",
        ("zero-shot prompting", "one-shot prompting", "few-shot prompting", "파인튜닝"),
        _reasons(
            "zero-shot prompting",
            {
                "one-shot prompting": "입출력 예시 하나를 제공",
                "few-shot prompting": "여러 예시를 제공",
                "파인튜닝": "모델 자체를 추가 학습",
            },
            "예시 없는 작업 지시",
        ),
        ("Zero-shot prompting",),
        2,
        stems=(
            "입출력 예시를 하나도 주지 않고 작업 지시만 프롬프트에 넣는다.",
            "번역 과업을 요청하면서 예시 답안 없이 명령만 전달하는 프롬프팅 방식이다.",
        ),
    ),
    Fact(
        "source-round-04",
        25,
        "C25",
        "지식 생성 프롬프팅",
        "답변 전에 관련 배경지식을 생성하고, 그 지식을 답변에 연결한다.",
        "지식 생성 프롬프팅",
        ("지식 생성 프롬프팅", "사후 검증", "무작위 샘플링", "이미지 분류"),
        _reasons(
            "지식 생성 프롬프팅",
            {
                "사후 검증": "답변 뒤 검증만 하는 절차",
                "무작위 샘플링": "데이터 표본 선택 방법",
                "이미지 분류": "영상 인식 과업",
            },
            "답변 전 지식 생성·연결",
        ),
        ("지식 생성 프롬프팅",),
        4,
        stems=(
            "최종 답변 전에 관련 사실을 먼저 떠올리게 한 뒤 그 사실을 답에 활용한다.",
            "문제 해결에 필요한 배경지식을 생성한 다음 답변을 작성하도록 지시한다.",
            "바로 답하지 않고, 먼저 유용한 지식 목록을 만들고 그 지식으로 답하게 한다.",
            "답변 품질을 위해 사전 지식 생성을 별도 단계로 넣는 프롬프팅 방식이다.",
        ),
    ),
    Fact(
        "source-round-04",
        30,
        "C30",
        "편향 없는 프롬프트",
        "연령만으로 학습 능력이나 디지털 적응을 일반화하지 않고 개인 숙련도를 묻는다.",
        "개인 숙련도 기준",
        ("개인 숙련도 기준", "연령 고정관념", "성별 고정관념", "무작위 추천"),
        _reasons(
            "개인 숙련도 기준",
            {
                "연령 고정관념": "나이만으로 능력을 단정",
                "성별 고정관념": "성별만으로 능력을 단정",
                "무작위 추천": "개인 정보에 근거한 지원이 아님",
            },
            "개인차 중심의 편향 완화",
        ),
        ("개인 숙련도 기준",),
        4,
        stems=(
            "나이 대신 실제 디지털 도구 사용 경험을 물어 학습 지원 수준을 정한다.",
            "‘고령자는 기술에 약하다’고 단정하지 않고 개인의 현재 숙련도를 확인한다.",
            "연령 집단 일반화 없이 각 사용자의 과업 경험을 기준으로 안내한다.",
            "지원 방식을 정할 때 출생연도가 아니라 개인의 도구 활용 수준을 묻는다.",
        ),
    ),
    Fact(
        "source-round-04",
        33,
        "C33",
        "GPT for PowerPoint",
        "주제나 키워드를 입력해 전체 프레젠테이션을 자동 구성하는 GPT for PowerPoint 기능이다.",
        "주제에서 만들기",
        ("주제에서 만들기", "슬라이드 정렬", "도형 편집", "발표 녹화"),
        _reasons(
            "주제에서 만들기",
            {
                "슬라이드 정렬": "기존 슬라이드 배치 기능",
                "도형 편집": "개별 객체 수정 기능",
                "발표 녹화": "발표 기록 기능",
            },
            "주제 입력 기반 전체 프레젠테이션 생성",
        ),
        ("주제에서 만들기",),
        2,
    ),
    Fact(
        "source-round-04",
        34,
        "C34",
        "AI 윤리",
        "기술을 개발 당시의 선한 목적에 맞게 쓰고 악의적으로 전용하지 않아야 한다.",
        "기술의 합목적성 원칙",
        ("기술의 합목적성 원칙", "신의성실의 원칙", "무작위성 원칙", "편의성 원칙"),
        _reasons(
            "기술의 합목적성 원칙",
            {
                "신의성실의 원칙": "계약·거래 관계의 성실 의무",
                "무작위성 원칙": "이 윤리 원칙의 명칭이 아님",
                "편의성 원칙": "이 윤리 원칙의 명칭이 아님",
            },
            "본래 목적에 맞는 기술 활용",
        ),
        ("기술의 합목적성 원칙",),
        2,
    ),
    Fact(
        "source-round-04",
        35,
        "C35",
        "AI 학습 보호",
        "사람 눈에는 거의 보이지 않는 픽셀 변형으로 예술가 스타일의 AI 학습을 방해한다.",
        "글레이즈(Glaze)",
        ("글레이즈(Glaze)", "워터마크", "OCR", "압축"),
        _reasons(
            "글레이즈(Glaze)",
            {
                "워터마크": "표시를 넣는 기술이지 스타일 모방 방해 도구가 아님",
                "OCR": "이미지 속 글자를 읽는 기술",
                "압축": "파일 크기를 줄이는 기술",
            },
            "보이지 않는 변형으로 스타일 학습 방해",
        ),
        ("글레이즈", "Glaze"),
        2,
    ),
)


def _is_unanswered(review: dict[str, Any]) -> bool:
    return bool(
        review.get("is_unanswered", not bool(str(review.get("submitted_answer", "")).strip()))
    )


def _latest_records(database_path: Path) -> dict[str, dict[str, Any]]:
    with sqlite3.connect(database_path) as connection:
        rows = connection.execute(
            "SELECT id, exam_id, submitted_at, reviews_json FROM attempts WHERE exam_id IN ({})".format(
                ", ".join("?" for _ in TARGET_EXAMS)
            ),
            TARGET_EXAMS,
        ).fetchall()
    grouped: dict[str, list[tuple[str, str, str, str]]] = defaultdict(list)
    for row in rows:
        grouped[str(row[1])].append((str(row[0]), str(row[1]), str(row[2]), str(row[3])))
    latest: dict[str, dict[str, Any]] = {}
    for exam_id, candidates in grouped.items():
        attempt_id, _, submitted_at, reviews_json = max(
            candidates, key=lambda row: (datetime.fromisoformat(row[2]), row[0])
        )
        latest[exam_id] = {
            "attempt_id": attempt_id,
            "submitted_at": submitted_at,
            "reviews": json.loads(reviews_json),
        }
    return latest


def _selected_sources(records: dict[str, dict[str, Any]]) -> set[tuple[str, int]]:
    selected: set[tuple[str, int]] = set()
    for exam_id, record in records.items():
        for review in record["reviews"]:
            if (
                not _is_unanswered(review)
                and bool(str(review.get("submitted_answer", "")).strip())
                and float(review["score"]) < float(review["possible_score"])
            ):
                selected.add((exam_id, int(review["number"])))
    return selected


def _source_question_types(content_root: Path) -> dict[tuple[str, int], str]:
    question_types: dict[tuple[str, int], str] = {}
    manifest_root = content_root / "data" / "web-exams"
    for exam_id in TARGET_EXAMS:
        manifest = json.loads((manifest_root / f"{exam_id}.json").read_text(encoding="utf-8"))
        question_types.update(
            {
                (exam_id, int(question["number"])): str(question["type"])
                for question in manifest["questions"]
            }
        )
    return question_types


def _reusable_sources(
    selected: set[tuple[str, int]], question_types: dict[tuple[str, int], str]
) -> set[tuple[str, int]]:
    return {source for source in selected if question_types.get(source) in REUSABLE_SOURCE_TYPES}


def _question(fact: Fact, number: int, variant: int) -> dict[str, Any]:
    choice_templates = (
        "다음 설명에 맞는 것을 고르시오.",
        "핵심 조건을 보고 가장 알맞은 개념을 고르시오.",
        "유사 개념과 구별할 때 알맞은 것을 고르시오.",
        "시험 직전 점검: 이 설명이 가리키는 것을 고르시오.",
    )
    short_answer_templates = (
        "핵심 답을 짧게 쓰시오.",
        "개념명 또는 도구명만 짧게 쓰시오.",
    )
    source_reference = {"exam_id": fact.exam_id, "number": fact.number}
    stem = fact.stems[variant % len(fact.stems)] if fact.stems else fact.stem
    if fact.short_answer and variant % 2 == 1:
        return {
            "number": number,
            "type": "short_answer",
            "chapter": fact.chapter,
            "topic": fact.topic,
            "prompt": f"{fact.topic} 빠른 복습\n\n{stem}\n\n{short_answer_templates[(variant // 2) % len(short_answer_templates)]}",
            "points": 2,
            "answer": fact.answer,
            "accepted_answers": list(dict.fromkeys((fact.answer, *fact.aliases))),
            "explanation": f"정답은 {fact.answer}이다. {fact.reasons[fact.answer]}",
            "source_reference": source_reference,
        }
    choices = list(fact.options)
    shift = (number + variant) % len(choices)
    choices = choices[shift:] + choices[:shift]
    answer_id = str(choices.index(fact.answer) + 1)
    return {
        "number": number,
        "type": "multiple_choice",
        "chapter": fact.chapter,
        "topic": fact.topic,
        "prompt": f"{choice_templates[variant % len(choice_templates)]}\n\n{stem}",
        "points": 2,
        "answer": answer_id,
        "accepted_answers": [answer_id],
        "source_reference": source_reference,
        "choices": [
            {
                "id": str(index + 1),
                "text": choice,
                "feedback": {"explanation": fact.reasons[choice]},
            }
            for index, choice in enumerate(choices)
        ],
    }


def build_manifest(database_path: Path, content_root: Path) -> dict[str, Any]:
    records = _latest_records(database_path)
    selected = _selected_sources(records)
    question_types = _source_question_types(content_root)
    reusable = _reusable_sources(selected, question_types)
    fact_sources = {(fact.exam_id, fact.number) for fact in FACTS}
    unsupported = reusable - fact_sources
    if unsupported:
        raise ValueError(
            f"No reviewed wrong-note content for current source reviews: {sorted(unsupported)}"
        )
    questions: list[dict[str, Any]] = []
    for fact in FACTS:
        if (fact.exam_id, fact.number) not in reusable:
            continue
        for variant in range(fact.count):
            questions.append(_question(fact, len(questions) + 1, variant))
    if len(questions) != 50:
        raise ValueError(
            f"Expected 50 questions from the current latest attempts, got {len(questions)}"
        )
    return {
        "id": OUTPUT_ID,
        "title": "AI-POT 오답 노트 Set 1 · 시험 직전 50문제",
        "source_kind": "wrong_answer_note",
        "study_mode": "wrong_note",
        "known_limitations": [
            "public-set-a Q38의 저장된 부분점수 근거는 원문과 충돌해 이 세트에서 제외했다."
        ],
        "provenance": {
            "targets": list(TARGET_EXAMS),
            "selection": "세트별 최신 제출 1회 · 미응답 제외 · 응답했지만 부분/오답만 포함",
            "latest_attempts": {
                exam_id: {key: record[key] for key in ("attempt_id", "submitted_at")}
                for exam_id, record in records.items()
            },
            "selected_source_reviews": [
                {"exam_id": exam_id, "number": number}
                for exam_id, number in sorted(fact_sources & reusable)
            ],
            "excluded_source_reviews": [
                {
                    "exam_id": exam_id,
                    "number": number,
                    "source_type": question_types.get((exam_id, number)),
                    "reason": (
                        "practical source is excluded; its stored criterion also conflicts with the source prompt and reference answer"
                        if (exam_id, number) == ("public-set-a", 38)
                        else "descriptive or practical source question is excluded"
                    ),
                }
                for exam_id, number in sorted(selected - reusable)
            ],
        },
        "questions": questions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-path", type=Path, required=True)
    parser.add_argument("--content-root", type=Path, required=True)
    args = parser.parse_args()
    manifest = build_manifest(args.database_path, args.content_root)
    output_path = args.content_root / "data" / "web-exams" / f"{OUTPUT_ID}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        f"{json.dumps(manifest, ensure_ascii=False, indent=2)}\n", encoding="utf-8"
    )
    print(
        f"Wrote {output_path} from {len(manifest['provenance']['latest_attempts'])} latest target attempts."
    )


if __name__ == "__main__":
    main()
