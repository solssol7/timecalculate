# ⏱️ 근무시간 정산 리포트 Pro+

복잡한 서버 설정 없이 브라우저에서 바로 실행되는 근무시간 정산 도구입니다.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 주요 기능

### 📊 근무시간 관리
- **주간/월간 보기**: 기간별 근무 기록 그룹화
- **월~금 전체 표시**: CSV에 없는 날짜도 자동 생성
- **주말 추가**: 필요 시 토/일 근무 입력 가능
- **오늘 하이라이트**: 현재 날짜 시각적 강조

### 🎯 목표 관리
- **주간 목표 설정**: 기본 40시간, 자유롭게 조정 가능
- **스마트 1/N**: 남은 평일 기준 하루 권장 근무시간 계산
- **금요일 퇴근 예측**: 목표 달성을 위한 퇴근 시간 예상

### 🎁 보상휴가 계산
- **1.5배 자동 계산**: 40시간 초과분에 대한 보상휴가
- **휴가 단위 분해**: 연차(8h) / 반차(4h) / 반반차(2h)로 환산
  ```
  예: 초과 5시간 × 1.5 = 7.5시간
      → 반차 1개 + 반반차 1개 + 1.5시간 감소
  ```

### ⚠️ 규정 체크
- **코어타임 위반 알림**: 설정된 시간 이후 출근 시 경고
- **주 52시간 초과 경고**: 법정 근로시간 초과 알림

### 💾 데이터 관리
- **로컬 저장**: 수정 데이터 자동 저장 (새로고침해도 유지)
- **시간 자동 포맷**: `930` → `09:30` 자동 변환
- **실시간 계산**: 입력 즉시 결과 반영 (디바운싱 적용)

---

## 🚀 시작하기

### 설치
```bash
# 저장소 클론
git clone https://github.com/your-repo/worktime-report.git

# 또는 ZIP 다운로드 후 압축 해제
```

### 실행
1. `index.html` 파일을 브라우저에서 열기
2. CSV 파일 업로드
3. 끝!

> 💡 Chrome, Edge, Safari, Firefox 최신 버전 지원

---

## 📁 파일 구조

```
worktime-report/
├── index.html          # 메인 HTML (구조)
├── css/
│   └── styles.css      # 스타일시트
├── js/
│   ├── config.js       # 설정 상수
│   ├── utils.js        # 유틸리티 함수
│   ├── ui.js           # UI 렌더링
│   └── app.js          # 앱 로직
└── README.md
```

### 파일별 역할

| 파일 | 역할 | 주요 내용 |
|------|------|----------|
| `config.js` | 설정값 | 점심시간, 휴가 단위, 스토리지 키 등 |
| `utils.js` | 순수 함수 | 시간 계산, 포맷팅, 날짜 유틸리티 |
| `ui.js` | 화면 렌더링 | HTML 템플릿, DOM 업데이트 |
| `app.js` | 비즈니스 로직 | 상태 관리, 이벤트, 계산 |

---

## 📝 CSV 형식

### 필수 컬럼

| 컬럼명 | 설명 | 예시 |
|--------|------|------|
| 이름 | 근무자 이름 | 홍길동 |
| 근무일자 | YYYY-MM-DD | 2024-12-05 |
| 출근시간 | HH:mm | 09:00 |
| 퇴근시간 | HH:mm | 18:00 |

### 선택 컬럼

| 컬럼명 | 설명 | 예시 |
|--------|------|------|
| 외출시간 | HH:mm (공제할 시간) | 01:00 |

### 예시 CSV
```csv
이름,근무일자,출근시간,퇴근시간,외출시간
홍길동,2024-12-02,09:00,18:30,
홍길동,2024-12-03,09:15,19:00,01:00
홍길동,2024-12-04,08:50,18:00,
```

> 💡 시간 형식이 `YYYY-MM-DD HH:mm:ss`처럼 길어도 자동 인식됩니다.

---

## ⚙️ 설정 변경

### 기본 설정 (config.js)

```javascript
const CONFIG = {
    // 점심시간 (자동 공제)
    LUNCH_START_HOUR: 11,
    LUNCH_START_MIN: 30,
    LUNCH_END_HOUR: 12,
    LUNCH_END_MIN: 30,

    // 근무 기준
    STANDARD_HOURS: 8,      // 일 기준 근무시간
    MAX_WEEKLY_HOURS: 52,   // 주 최대 근무시간
    DEFAULT_TARGET: 40,     // 주간 목표 시간

    // 보상휴가 배율
    REWARD_MULTIPLIER: 1.5,

    // 휴가 단위 (시간)
    LEAVE_UNITS: {
        ANNUAL: 8,    // 연차
        HALF: 4,      // 반차
        QUARTER: 2    // 반반차
    }
};
```

---

## 🔧 고급 기능

### 로컬 스토리지 초기화
브라우저 콘솔에서 실행:
```javascript
App.clearStorage();
```

### 저장된 데이터 확인
```javascript
// 설정
localStorage.getItem('worktime_settings');

// 근무 데이터
localStorage.getItem('worktime_data');
```

---

## 🎨 시간 입력 자동 포맷

| 입력 | 변환 결과 |
|------|----------|
| `9` | `09:00` |
| `18` | `18:00` |
| `930` | `09:30` |
| `1830` | `18:30` |
| `0930` | `09:30` |

---

## 📱 브라우저 호환성

| 브라우저 | 지원 |
|----------|------|
| Chrome 80+ | ✅ |
| Edge 80+ | ✅ |
| Safari 14+ | ✅ |
| Firefox 75+ | ✅ |

---

## 🛠️ 기술 스택

- **HTML5**
- **CSS3** (Tailwind CSS CDN)
- **JavaScript** (Vanilla JS, ES6+)

---

## 📄 라이선스

MIT License

---

## 🤝 기여하기

1. Fork
2. Feature branch 생성 (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Pull Request

---

## 📮 문의

이슈 등록 또는 PR을 통해 개선 사항을 제안해 주세요!
