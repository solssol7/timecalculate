// 설정값
const MAX_HOURS = 40; // 법정 근로 시간

// DOM 요소 가져오기
const workInput = document.getElementById('workInput');
const currentHoursElem = document.getElementById('currentHours');
const remainHoursElem = document.getElementById('remainHours');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');

const overtimeSection = document.getElementById('overtimeSection');
const overtimeHoursElem = document.getElementById('overtimeHours');

// 보상 배지 요소들
const badgeQuarter = document.getElementById('badgeQuarter'); // 반반차 (2시간)
const badgeHalf = document.getElementById('badgeHalf');       // 반차 (4시간)
const badgeDay = document.getElementById('badgeDay');         // 1일 (8시간)

// 이벤트 리스너: 입력값이 변할 때마다 실행
workInput.addEventListener('input', updateDashboard);

function updateDashboard() {
    // 1. 입력값 가져오기 (숫자로 변환)
    const currentHours = parseFloat(workInput.value) || 0;

    // 2. 화면 텍스트 갱신
    currentHoursElem.innerText = currentHours;

    // 3. 잔여 시간 계산 로직
    let remain = MAX_HOURS - currentHours;
    if (remain < 0) remain = 0; // 마이너스가 되지 않게 처리
    remainHoursElem.innerText = remain.toFixed(1); // 소수점 1자리까지

    // 4. 프로그레스 바 업데이트
    let percentage = (currentHours / MAX_HOURS) * 100;
    if (percentage > 100) percentage = 100; // 바는 100%를 넘지 않음
    progressBar.style.width = `${percentage}%`;

    // 5. 상태별 로직 분기 (핵심)
    if (currentHours > MAX_HOURS) {
        handleOvertime(currentHours);
    } else {
        handleNormalWork();
    }
}

// 정상 근무 상태 처리
function handleNormalWork() {
    progressBar.classList.remove('over', 'limit');
    statusText.innerText = "정상 근무 중";
    statusText.className = "status-normal";
    
    // 보상 섹션 숨기기
    overtimeSection.classList.add('hidden');
}

// 초과 근무 상태 처리 & 보상 계산
function handleOvertime(current) {
    progressBar.classList.add('over');
    statusText.innerText = "초과 근무 발생";
    statusText.className = "status-over";

    // 보상 섹션 보이기
    overtimeSection.classList.remove('hidden');

    // 초과 시간 계산
    const overtime = current - MAX_HOURS;
    overtimeHoursElem.innerText = overtime.toFixed(1);

    // ★ 보상 휴가 활성화 로직 (자동 계산) ★
    // 2시간 이상 -> 반반차 가능
    if (overtime >= 2) badgeQuarter.classList.add('active');
    else badgeQuarter.classList.remove('active');

    // 4시간 이상 -> 반차 가능
    if (overtime >= 4) badgeHalf.classList.add('active');
    else badgeHalf.classList.remove('active');

    // 8시간 이상 -> 1일 연차 가능
    if (overtime >= 8) badgeDay.classList.add('active');
    else badgeDay.classList.remove('active');
}

// 초기 실행
updateDashboard();
