#!/usr/bin/env node
/**
 * Builds the supplied AI-POT Level 1 sample package into a learner-facing
 * 40-question manifest. The Markdown package is the sole source of stems,
 * choices, answer grounds, practical references, and all text-convertible
 * visual material; no whole-page screenshots are carried into the web set.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const checkOnly = process.argv.includes("--check");
const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const source = process.env.AIPOT_SAMPLE_QUESTIONS_SOURCE
  ? resolve(process.env.AIPOT_SAMPLE_QUESTIONS_SOURCE)
  : resolve(process.cwd(), "aipot-level1-sample-questions/AI-POT-1급-테스트-제공문제.md");
const output = resolve(contentRoot, "data/web-exams/sample-set-01.json");
const dictionaryOutput = resolve(contentRoot, "data/aipot-keyword-dictionary.json");
const circled = { "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5" };

const metadata = {
  1: ["C01", "다층 퍼셉트론과 XOR"], 2: ["C02", "강화학습"], 3: ["C06", "미세 조정"],
  4: ["C12", "검색 증강 생성(RAG)"], 5: ["C04", "생성적 적대 신경망(GAN)"],
  6: ["C14", "NotebookLM"], 7: ["C08", "업무 스킬"], 8: ["C05", "트랜스포머와 어텐션"],
  9: ["C07", "맥락 설계"], 10: ["C07", "SCQA"], 11: ["C13", "Presence Penalty"],
  12: ["C07", "Persona-Guide"], 13: ["C08", "자기 일관성"], 14: ["C12", "근거 기반 응답"],
  15: ["C16", "간접 프롬프트 주입 방어"], 16: ["C16", "Project Glaze"], 17: ["C14", "통합 리스크 분석"],
  18: ["C14", "BCG 매트릭스"], 19: ["C14", "BCG 물음표 전략"], 20: ["C14", "SWOT SO 전략"],
  21: ["C14", "활동성 비율"], 22: ["C14", "이익의 질"], 23: ["C14", "AI 기반 투자 검증"],
  24: ["C14", "PER"], 25: ["C14", "청년 고용지표"], 26: ["C14", "기준금리 파급"],
  27: ["C14", "GDP와 수입"], 28: ["C14", "채권 가격과 금리"], 29: ["C14", "통화정책"],
  30: ["C14", "통화정책 종합 판단"], 31: ["C06", "미세 조정"], 32: ["C12", "검색 증강 생성(RAG)"],
  33: ["C14", "환금성"], 34: ["C14", "자연실업률"], 35: ["C14", "PEST 분석"],
  36: ["C14", "자산 포트폴리오"], 37: ["C14", "산업 트렌드 분석"], 38: ["C14", "STP 전략"],
  39: ["C13", "대출 상환 계산"], 40: ["C14", "거시경제 정책 제안"],
};

const topicGuides = {
  "다층 퍼셉트론과 XOR": ["다층 퍼셉트론은 은닉층과 비선형 활성화 함수로 복잡한 함수를 표현하는 신경망이다.", "선형 분리가 어려운 XOR 같은 문제를 학습하는 데 쓰인다."],
  "강화학습": ["강화학습은 에이전트가 환경과 상호작용하며 보상을 최대화하는 정책을 학습하는 방법이다.", "로봇 제어, 게임, 경로 탐색처럼 행동의 장기 결과를 최적화할 때 사용한다."],
  "미세 조정": ["미세 조정은 사전 학습된 모델을 특정 도메인이나 과업 데이터로 추가 학습하는 과정이다.", "범용 모델을 고객지원·마케팅 등 특정 업무에 맞게 조정할 때 사용한다."],
  "검색 증강 생성(RAG)": ["RAG는 관련 문서를 검색해 모델 입력의 근거로 넣고 답변을 생성하는 구조다.", "최신 내부 문서에 근거한 답변과 환각 완화에 사용한다."],
  "생성적 적대 신경망(GAN)": ["GAN은 생성자와 판별자가 경쟁하며 실제와 유사한 데이터를 만드는 생성 모델이다.", "이미지·음성 합성 및 딥페이크 위험을 이해할 때 사용한다."],
  "NotebookLM": ["NotebookLM은 사용자가 제공한 자료를 중심으로 요약과 질의응답을 지원하는 도구다.", "업로드한 문서에 근거한 탐색과 출처 확인에 사용한다."],
  "업무 스킬": ["업무 스킬은 지침·도구·규칙을 재사용 가능한 작업 단위로 묶은 구성이다.", "조직에서 프롬프트 품질과 결과 형식을 표준화하는 데 사용한다."],
  "트랜스포머와 어텐션": ["트랜스포머는 self-attention으로 토큰 사이의 관계를 계산하는 신경망 구조다.", "언어 이해·생성에서 긴 문맥과 병렬 처리를 다룰 때 사용한다."],
  "맥락 설계": ["맥락 설계는 역할, 배경, 자료, 제약, 출력 형식을 AI에 구조적으로 제공하는 일이다.", "모호성을 줄이고 업무에 맞는 출력을 안정적으로 얻는 데 사용한다."],
  "SCQA": ["SCQA는 Situation, Complication, Question, Answer 순으로 논리를 구성하는 프레임워크다.", "보고서와 제안서에서 문제와 해결안을 설득력 있게 전개할 때 사용한다."],
  "Presence Penalty": ["Presence penalty는 이미 등장한 주제·토큰의 재등장을 억제해 새 주제를 유도하는 생성 파라미터다.", "반복을 줄이면서 내용의 화제를 넓히는 데 사용한다."],
  "Persona-Guide": ["Persona-Guide는 AI의 역할과 지켜야 할 지침·제약을 명시하는 프롬프트 패턴이다.", "규정 기반 고객 안내처럼 허용 범위를 엄격히 지켜야 할 때 사용한다."],
  "자기 일관성": ["자기 일관성은 여러 추론 경로를 만들고 가장 일관된 결론을 선택하는 접근이다.", "복잡한 추론 문제에서 단일 답변의 우연한 오류를 줄이는 데 사용한다."],
  "근거 기반 응답": ["근거 기반 응답은 자료에 없는 내용을 추측하지 않고 제공된 근거 안에서 답하는 원칙이다.", "문서 질의응답과 규정 안내에서 환각을 줄이는 데 사용한다."],
  "간접 프롬프트 주입 방어": ["간접 프롬프트 주입 방어는 외부 문서 안의 명령을 데이터로 취급해 모델 지시와 분리하는 보안 원칙이다.", "웹페이지·첨부문서·검색 결과를 처리하는 에이전트에 사용한다."],
  "Project Glaze": ["Project Glaze는 창작물의 스타일을 모방 학습으로부터 보호하기 위한 교란 기술이다.", "이미지 창작자의 스타일 무단 모방 위험을 줄이는 데 사용한다."],
  "통합 리스크 분석": ["통합 리스크 분석은 거시환경, 산업 구조, 조직 내부 요인을 함께 검토하는 방법이다.", "전략·투자 의사결정의 복합 위험을 탐색할 때 사용한다."],
  "BCG 매트릭스": ["BCG 매트릭스는 시장 성장률과 상대적 시장점유율로 사업 포트폴리오를 분류한다.", "투자·유지·회수 전략을 검토할 때 사용한다."],
  "BCG 물음표 전략": ["물음표 사업은 성장률은 높고 상대점유율은 낮아 투자 또는 철수 선택이 필요한 영역이다.", "제한된 자원을 집중할 사업을 판단할 때 사용한다."],
  "SWOT SO 전략": ["SO 전략은 내부 강점을 외부 기회에 활용하는 공격적 전략이다.", "기술·브랜드 강점으로 성장 시장을 공략할 때 사용한다."],
  "활동성 비율": ["활동성 비율은 재고·매출채권·자산이 얼마나 효율적으로 회전하는지 보여주는 재무비율이다.", "운영 효율과 자산 활용도를 분석할 때 사용한다."],
  "이익의 질": ["이익의 질은 이익이 본업의 지속 가능한 영업활동에서 나왔는지 평가하는 개념이다.", "일회성 영업외이익과 지속적 수익성을 구분할 때 사용한다."],
  "AI 기반 투자 검증": ["AI 기반 투자 검증은 AI의 설명을 가설로 삼고 공시·실적·시장 지표로 교차 확인하는 방법이다.", "투자 판단의 과신과 환각 위험을 낮추는 데 사용한다."],
  "PER": ["PER은 주가를 주당순이익으로 나눈 주가수익비율이다.", "기업 이익 대비 시장의 평가 수준을 비교할 때 사용한다."],
  "청년 고용지표": ["청년 고용지표는 실업률뿐 아니라 고용률과 경제활동참가율을 함께 보는 노동시장 지표다.", "구직 포기 등으로 실업률만 낮아지는 착시를 피할 때 사용한다."],
  "기준금리 파급": ["기준금리 파급은 중앙은행 금리 변화가 예금·대출금리와 소비·투자에 전달되는 과정이다.", "통화정책의 금융시장·실물경제 영향을 분석할 때 사용한다."],
  "GDP와 수입": ["GDP 지출항등식은 소비·투자·정부지출·순수출(C+I+G+X−M)로 국내 생산을 계산한다.", "수입품 소비가 지출에는 포함돼도 순수출에서 차감되는 이유를 설명할 때 사용한다."],
  "채권 가격과 금리": ["채권 가격과 시장금리는 일반적으로 반대 방향으로 움직인다.", "시장금리 변화가 기존 고정이표채의 상대적 매력에 미치는 영향을 판단할 때 사용한다."],
  "통화정책": ["통화정책은 기준금리, 공개시장조작, 지급준비율 등으로 유동성과 금융여건에 영향을 주는 정책이다.", "물가 안정과 경기 조절을 위해 사용한다."],
  "통화정책 종합 판단": ["통화정책 종합 판단은 물가·고용·성장·환율·부채·금융불안을 함께 고려하는 의사결정이다.", "단일 지표나 AI 요약에 의존하지 않는 정책 검토에 사용한다."],
  "환금성": ["환금성은 자산을 큰 손실이나 비용 없이 얼마나 빨리 현금으로 바꿀 수 있는지를 뜻한다.", "유동성 위험과 단기 자금 대응력을 평가할 때 사용한다."],
  "자연실업률": ["자연실업률은 경기침체가 없어도 마찰적·구조적 실업으로 존재하는 정상적 장기 실업률이다.", "경기순환적 실업과 구분해 노동시장을 해석할 때 사용한다."],
  "PEST 분석": ["PEST 분석은 정치, 경제, 사회, 기술 환경을 체계적으로 검토하는 거시환경 분석 틀이다.", "산업 기회·위협과 전략적 시사점을 정리할 때 사용한다."],
  "자산 포트폴리오": ["자산 포트폴리오는 수익성·안정성·환금성의 상충관계를 고려해 자산을 조합한 투자 구성이다.", "투자자의 위험선호에 맞는 분산 배분을 설계할 때 사용한다."],
  "산업 트렌드 분석": ["산업 트렌드 분석은 변화 요인, 기간, 영향도, 기업 영향을 구조화해 전략을 도출하는 작업이다.", "시장 변화에 대한 실행 우선순위를 정할 때 사용한다."],
  "STP 전략": ["STP는 시장 세분화(Segmentation), 표적시장 선정(Targeting), 포지셔닝(Positioning)으로 구성된 마케팅 전략 틀이다.", "고객군별 가치 제안과 차별화된 시장 진입을 설계할 때 사용한다."],
  "대출 상환 계산": ["대출 상환 계산은 상환 방식별 원금 감소와 이자 발생을 월 단위로 계산하는 작업이다.", "원리금균등과 원금균등의 비용 차이를 비교할 때 사용한다."],
  "거시경제 정책 제안": ["거시경제 정책 제안은 성장·고용·물가·재정여력·금융안정을 함께 평가해 재정과 통화 수단을 조합하는 작업이다.", "침체와 물가 위험이 공존하는 상황의 정책 대안을 검토할 때 사용한다."],
};

const shortAnswers = {
  31: ["미세 조정(Fine-tuning)", ["미세 조정", "미세조정", "fine tuning", "fine-tuning", "finetuning"]],
  32: ["검색 증강 생성(RAG)", ["검색 증강 생성", "검색증강생성", "rag", "retrieval augmented generation"]],
  33: ["환금성(유동성)", ["환금성", "유동성", "liquidity"]],
  34: ["자연실업률", ["자연실업률", "natural rate of unemployment"]],
  35: ["PEST 분석", ["pest", "pest 분석", "pest analysis"]],
};

const practicalRubrics = {
  36: ["첨부 파일 근거 한정", "세 자산과 세 평가 축", "Trade-off 설명", "두 투자자 유형", "배분 비율과 근거"],
  37: ["전기차 5개 트렌드", "기간과 영향력 표기", "각 트렌드의 기업 영향", "전문가 관점", "전략적 시사점"],
  38: ["STP 세 단계", "네 세그먼트", "A·B 타깃과 선정 근거", "경쟁 서비스 비교", "핵심 가치와 포지셔닝"],
  39: ["두 상환 방식 비교", "36개월 조건 반영", "총이자 계산", "중도상환 조건 반영", "차이와 근거 제시"],
  40: ["경기 국면 진단", "재정정책 제안", "통화정책 제안", "장점·한계 비교", "추가 검증 지표"],
};

const optionGuides = [
  [/ReLU/u, "ReLU는 음수 입력을 0으로 만들고 양수는 통과시키는 활성화 함수다.", "깊은 신경망의 기울기 소실을 완화하는 데 사용한다."],
  [/GPU/u, "GPU는 대규모 행렬 연산을 병렬 처리하는 연산 장치다.", "대규모 모델 학습 시간을 줄이는 데 사용한다."],
  [/판별자와 생성자|GAN/u, "GAN은 생성자와 판별자가 경쟁해 실제와 유사한 데이터를 만드는 모델이다.", "이미지·음성 합성과 생성 품질 개선에 사용한다."],
  [/선형 회귀/u, "선형 회귀는 수치형 목표값과 입력 변수 사이의 관계를 예측하는 지도학습 기법이다.", "매출·수요 같은 연속값 예측에 사용한다."],
  [/비지도학습|군집화/u, "비지도학습은 정답 레이블 없이 데이터의 구조나 군집을 찾는 학습 방식이다.", "고객 세분화와 유사 패턴 탐색에 사용한다."],
  [/강화학습/u, "강화학습은 행동 뒤의 보상을 이용해 정책을 개선하는 학습 방식이다.", "로봇 제어·경로 탐색·게임 의사결정에 사용한다."],
  [/사전 학습/u, "사전 학습은 방대한 일반 데이터로 언어·표현의 기본 패턴을 먼저 익히는 단계다.", "후속 과업에 재사용할 범용 기반 모델을 만드는 데 사용한다."],
  [/미세 조정|Fine-tuning/u, "미세 조정은 사전 학습 모델을 특정 도메인·과업 데이터로 추가 학습하는 과정이다.", "범용 모델을 업무별 전용 모델로 조정할 때 사용한다."],
  [/검색 증강 생성|RAG/u, "RAG는 관련 문서를 검색해 생성 모델의 답변 근거로 제공하는 구조다.", "최신 문서 기반 질의응답과 환각 완화에 사용한다."],
  [/변이형 자동 인코더|VAE/u, "VAE는 잠재변수의 확률 분포를 학습해 데이터를 생성하는 오토인코더 계열 모델이다.", "잠재공간 기반 생성과 표현 학습에 사용한다."],
  [/토픽 모델링/u, "토픽 모델링은 문서 집합에서 함께 나타나는 단어 패턴으로 주제를 추정하는 기법이다.", "대량 문서의 주제 탐색과 분류 보조에 사용한다."],
  [/Temperature/u, "Temperature는 다음 토큰 확률 분포의 무작위성을 조절하는 생성 파라미터다.", "응답의 창의성과 일관성 사이의 균형을 조절할 때 사용한다."],
  [/Top-p/u, "Top-p는 누적 확률이 일정 기준에 도달한 후보 토큰만 선택하는 샘플링 방법이다.", "생성 후보의 다양성과 안정성을 조절할 때 사용한다."],
  [/Frequency Penalty/u, "Frequency penalty는 같은 토큰이 반복되는 빈도에 패널티를 주는 생성 파라미터다.", "동일 표현의 반복을 줄이는 데 사용한다."],
  [/Presence Penalty/u, "Presence penalty는 이미 등장한 토큰·주제의 재등장을 억제하는 생성 파라미터다.", "새로운 화제나 내용을 유도할 때 사용한다."],
  [/SCQA|Situation|Complication|Question|Answer/u, "SCQA는 상황·문제·질문·답변 순으로 논리를 전개하는 프레임워크다.", "기획안과 보고서의 문제 정의 및 설득 구조에 사용한다."],
  [/Persona-Guide|PAS 패턴|Insight-Action/u, "프롬프트 패턴은 목적에 맞게 역할, 근거, 절차, 출력 형식을 구조화하는 방법이다.", "고객 응대·기획·분석 등 업무별 출력 품질을 통제하는 데 사용한다."],
  [/퓨샷|제로샷|자기 일관성|CoT/u, "샷 기반·추론 기반 프롬프팅은 예시 제공이나 여러 추론 경로를 통해 모델의 작업 수행을 돕는 방법이다.", "복잡한 분류·추론 작업의 정확도와 형식 준수에 사용한다."],
  [/추측하지 말고|알 수 없습니다/u, "근거 제한 지시는 자료에 없는 내용을 추측하지 않고 불확실성을 명시하게 하는 제약이다.", "문서 기반 답변에서 환각을 줄이는 데 사용한다."],
  [/명령.*참조 데이터|참조 데이터/u, "신뢰할 수 없는 외부 입력을 명령이 아닌 데이터로 격리하는 것은 프롬프트 주입 방어 원칙이다.", "문서·웹 검색을 처리하는 AI 에이전트 보안에 사용한다."],
  [/PhotoGuard|Project Glaze/u, "창작물 보호 기법은 이미지가 무단 학습이나 스타일 모방에 쓰이는 위험을 낮추는 기술이다.", "창작자의 작품과 스타일을 보호하는 데 사용한다."],
  [/스타|도그|물음표|캐시카우/u, "BCG 매트릭스는 시장 성장률과 상대 점유율로 사업을 스타·캐시카우·물음표·도그로 분류한다.", "사업별 투자, 유지, 회수 우선순위를 정할 때 사용한다."],
  [/SO 전략|ST 전략|WO 전략|WT 전략/u, "SWOT 전략은 강점·약점과 기회·위협을 교차해 실행 방향을 정하는 틀이다.", "내외부 환경을 바탕으로 성장·방어 전략을 설계할 때 사용한다."],
  [/재고자산 회전율|활동성 비율|수익성 비율|안정성 비율/u, "재무비율은 기업의 수익성, 안정성, 활동성, 성장성을 수치로 진단하는 지표다.", "재무제표를 비교하고 운영 효율을 평가할 때 사용한다."],
  [/PER/u, "PER은 주가를 주당순이익으로 나눈 주가수익비율이다.", "기업 이익 대비 시장 평가 수준을 비교할 때 사용한다."],
  [/실업률|고용률|경제활동참가율/u, "노동시장 지표는 구직자뿐 아니라 취업자와 경제활동 인구의 변화를 함께 보여준다.", "실업률만으로 놓칠 수 있는 고용 상황을 해석할 때 사용한다."],
  [/기준금리|공개시장조작|지급준비율/u, "통화정책 수단은 유동성·금융여건·차입비용에 영향을 주는 중앙은행의 도구다.", "물가 안정과 경기 조절을 위해 사용한다."],
  [/수입\(M\)|GDP|소비\(C\)|정부지출\(G\)/u, "GDP 지출항등식은 소비·투자·정부지출·순수출로 국내 생산을 계산한다.", "수입과 국내 생산의 관계를 해석할 때 사용한다."],
  [/채권|시장금리/u, "고정이표채의 시장가격은 새로 발행되는 채권 금리와 비교해 조정된다.", "금리 변동에 따른 기존 채권의 가격 위험을 분석할 때 사용한다."],
];

function clean(value) {
  return value.replace(/^원본:\s*.*\n+/mu, "")
    .replace(/^### 제시문 \/ 요구 결과\s*$/gmu, "")
    .replace(/^### 시각 자료 텍스트 전사\s*$/gmu, "")
    .replace(/^!\[[^\]]*\]\([^\n]*\)\s*$/gmu, "")
    .replace(/^>\s?/gmu, "")
    .replace(/^\d+\s*\/\s*\d+\s*$/gmu, "")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function parseSections(markdown) {
  const parts = markdown.split(/^## 문제 (\d{1,2})\s*$/gmu);
  const entries = [];
  for (let index = 1; index < parts.length; index += 2) entries.push([Number(parts[index]), parts[index + 1]]);
  if (entries.length !== 40) throw new Error(`Expected 40 source questions, found ${entries.length}.`);
  return new Map(entries);
}

function answerBody(section) {
  const heading = "### 정답 및 근거";
  const index = section.indexOf(heading);
  return index < 0 ? "" : clean(section.slice(index + heading.length));
}

function before(section, heading) {
  const index = section.indexOf(heading);
  if (index < 0) throw new Error(`Missing ${heading}`);
  return clean(section.slice(0, index));
}

function choiceGuide(text, topic) {
  const optionGuide = optionGuides.find(([pattern]) => pattern.test(text));
  const [definition, purpose] = optionGuide?.slice(1) ?? topicGuides[topic] ?? [
    `‘${text}’은(는) 이 문항에서 제시된 개념 또는 판단 기준과 관련된 선택지다.`,
    "문항의 조건과 결과를 비교해 적절한 판단을 고를 때 사용한다.",
  ];
  return { definition: `‘${text}’은(는) ${definition}`, purpose };
}

function choiceFeedback(choice, correctChoice, topic, correct, rationale) {
  const guide = choiceGuide(choice, topic);
  return {
    definition: guide.definition,
    purpose: guide.purpose,
    reason: correct
      ? `${rationale} 따라서 이 선택지는 문항의 조건을 직접 충족하는 정답이다.`
      : `${rationale} ‘${choice}’은(는) 관련된 용어·방법 또는 주장일 수 있지만, 이 문항에서 요구한 판단 기준을 충족하지 않아 오답이다.`,
    similarities: correct
      ? `${topic}의 핵심 조건과 목적을 직접 다룬다.`
      : `정답 ‘${correctChoice}’와 마찬가지로 ${topic} 또는 그 인접 개념을 다룬다.`,
    differences: correct
      ? "다른 선택지는 적용 대상, 작동 원리, 순서, 범위 또는 정책 효과가 이 기준과 다르다."
      : `정답 ‘${correctChoice}’는 문항의 조건과 근거를 모두 만족한다. 반면 이 선택지는 ${topic}의 대상·목적·작동 원리 또는 적용 범위가 다르다.`,
  };
}

function multipleChoice(number, section) {
  const stem = before(section, "### 선택지");
  const choiceBlock = section.slice(section.indexOf("### 선택지") + "### 선택지".length, section.indexOf("### 정답 및 근거"));
  const choices = [...choiceBlock.matchAll(/^([1-5])\.\s+(.+)$/gmu)].map((match) => match[2].trim());
  if (choices.length !== 4) throw new Error(`Q${number}: expected four choices, found ${choices.length}.`);
  const answer = answerBody(section).match(/^\*\*정답(?:\(추정\))?:\s*([①②③④⑤])/mu)?.[1];
  if (!answer) throw new Error(`Q${number}: could not parse answer.`);
  const answerId = circled[answer];
  const rationale = answerBody(section).replace(/^\*\*정답(?:\(추정\))?:[^\n]*\n*/mu, "").trim();
  const [chapter, topic] = metadata[number];
  const correctChoice = choices[Number(answerId) - 1];
  return {
    id: `sample-s01-q${String(number).padStart(2, "0")}`,
    number, type: "multiple_choice", chapter, topic, prompt: stem, points: 2,
    answer: answerId, accepted_answers: [answerId], explanation: rationale,
    single_concept_explanation: true,
    choices: choices.map((text, index) => ({
      id: String(index + 1), text,
      feedback: choiceFeedback(text, correctChoice, topic, String(index + 1) === answerId, rationale),
    })),
  };
}

function shortAnswer(number, section) {
  const [chapter, topic] = metadata[number];
  const [answer, accepted] = shortAnswers[number];
  const prompt = number === 35
    ? "전기차 산업을 정치·경제·사회·기술 관점에서 분석하는 거시환경 프레임워크를 쓰시오."
    : before(section, "### 답안 형식");
  return {
    id: `sample-s01-q${String(number).padStart(2, "0")}`,
    number, type: "short_answer", chapter, topic, prompt, points: 3,
    answer, accepted_answers: accepted, explanation: answerBody(section),
    single_concept_explanation: true, choices: [],
  };
}

function practical(number, section) {
  const [chapter, topic] = metadata[number];
  const prompt = before(section, "### 답안 형식");
  const solution = answerBody(section);
  return {
    id: `sample-s01-q${String(number).padStart(2, "0")}`,
    number, type: "practical_prompt", chapter, topic, prompt, points: 5,
    answer: "", accepted_answers: [], explanation: `${topic}의 요구 조건을 빠짐없이 포함했는지 검토하세요.`,
    single_concept_explanation: false, choices: [],
    rubric: practicalRubrics[number].map((criterion) => ({ criterion, points: 1, keywords: [criterion] })),
    evaluation: {
      kind: "text", availability: "available", input_assets: [], context_markdown: prompt,
      provider_solution: solution,
      reference_source: "AI-POT 1급 테스트 제공 문제 — 제공된 정답 및 근거",
    },
  };
}

function dictionaryEntry(term, sourceQuestion) {
  const [definition, purpose] = topicGuides[term];
  return {
    korean_term: term, english_term: "See Korean term", definition, primary_purpose: purpose,
    common_use_cases: ["객관식 개념 구분", "단답형 핵심어 회상", "실습형 프롬프트 검토"],
    related_concepts: ["프롬프트", "데이터", "모델 평가"],
    similar_concepts: ["인접 AI-POT 용어"],
    key_differences: "유사한 용어라도 목표, 입력 근거, 처리 방식, 검증 기준이 다를 수 있습니다.",
    common_misconceptions: ["관련 개념을 동일한 의미로 간주하는 것", "하나의 지표나 도구만으로 결론을 확정하는 것"],
    examples: [`${term}의 정의와 적용 조건을 문항 근거로 구분해 설명한다.`],
    relevant_questions_or_categories: [`sample-set-01 Q${String(sourceQuestion).padStart(2, "0")}`],
  };
}

function updateDictionary() {
  const dictionary = JSON.parse(readFileSync(dictionaryOutput, "utf8"));
  const byTerm = new Map(dictionary.entries.map((entry) => [entry.korean_term, entry]));
  for (const [number, [, term]] of Object.entries(metadata)) {
    if (!topicGuides[term]) continue;
    const existing = byTerm.get(term);
    const relevant = `sample-set-01 Q${String(number).padStart(2, "0")}`;
    if (existing) {
      existing.relevant_questions_or_categories = [...new Set([...(existing.relevant_questions_or_categories ?? []), relevant])];
    } else {
      const entry = dictionaryEntry(term, Number(number));
      dictionary.entries.push(entry);
      byTerm.set(term, entry);
    }
  }
  dictionary.entries.sort((left, right) => left.korean_term.localeCompare(right.korean_term, "ko"));
  return `${JSON.stringify(dictionary, null, 2)}\n`;
}

const sections = parseSections(readFileSync(source, "utf8"));
const questions = Array.from({ length: 40 }, (_, index) => {
  const number = index + 1;
  const section = sections.get(number);
  if (number <= 30) return multipleChoice(number, section);
  if (number <= 35) return shortAnswer(number, section);
  return practical(number, section);
});
const manifest = {
  id: "sample-set-01", title: "AI-POT 1급 테스트 제공 문제", source_kind: "provided_sample_markdown",
  source_reference: "aipot-level1-sample-questions/AI-POT-1급-테스트-제공문제.md",
  questions,
  known_limitations: [
    "Q18–Q19는 제공 문서가 표시한 것처럼 원본의 전제 자료가 누락되어, 제시된 추정 정답과 근거로 구성했습니다.",
    "Q35는 공식 100점 구조를 유지하기 위해 PEST 핵심어 단답형으로 정규화했습니다. 원문 프롬프트 작성 과업은 Q36–Q40의 실습형 평가에 반영됩니다.",
  ],
};
const nextManifest = `${JSON.stringify(manifest, null, 2)}\n`;
const nextDictionary = updateDictionary();
const currentManifest = (() => { try { return readFileSync(output, "utf8"); } catch { return ""; } })();
const currentDictionary = readFileSync(dictionaryOutput, "utf8");
const stale = currentManifest !== nextManifest || currentDictionary !== nextDictionary;
if (checkOnly && stale) {
  console.error("Provided sample set is out of date. Run: node tools/import-aipot-provided-sample-set.mjs");
  process.exit(1);
}
if (!checkOnly) {
  writeFileSync(output, nextManifest, "utf8");
  writeFileSync(dictionaryOutput, nextDictionary, "utf8");
}
console.log(checkOnly ? "Provided sample set is current." : "Provided sample set and dictionary references updated.");
