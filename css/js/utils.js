/**
 * TimeUtils: 시간 계산 유틸리티
 */
const TimeUtils = {
    cleanTimeStr(str) {
        if (!str) return '';
        str = str.trim();
        if (str.includes(' ')) {
            const parts = str.split(' ');
            const timePart = parts.find(p => p.includes(':'));
            return timePart ? timePart.substring(0, 5) : '';
        }
        return str.includes(':') ? str.substring(0, 5) : str;
    },

    parseSmartTime(timeStr, baseDateStr) {
        if (!timeStr || timeStr === '-' || timeStr === '') return null;
        const cleanTime = this.cleanTimeStr(timeStr);
        if (!cleanTime.includes(':')) return null;
        const [h, m] = cleanTime.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        const dt = baseDateStr ? new Date(baseDateStr) : new Date();
        dt.setHours(h, m, 0, 0);
        return dt;
    },

    calcDuration(startObj, endObj) {
        if (!startObj || !endObj) return 0;
        let diffMs = endObj - startObj;
        if (diffMs < 0) return 0;

        // 점심시간 공제
        const lunchStart = new Date(startObj);
        lunchStart.setHours(CONFIG.LUNCH_START_HOUR, CONFIG.LUNCH_START_MIN, 0, 0);
        const lunchEnd = new Date(startObj);
        lunchEnd.setHours(CONFIG.LUNCH_END_HOUR, CONFIG.LUNCH_END_MIN, 0, 0);

        const overlapStart = new Date(Math.max(startObj, lunchStart));
        const overlapEnd = new Date(Math.min(endObj, lunchEnd));
        const deduction = (overlapEnd > overlapStart) ? (overlapEnd - overlapStart) : 0;

        return (diffMs - deduction) / 3600000;
    },

    timeToHours(str) {
        if (!str || str === '-') return 0;
        const [h, m] = str.split(':').map(Number);
        return isNaN(h) ? 0 : h + (isNaN(m) ? 0 : m / 60);
    },

    fmtH(n) {
        if (isNaN(n) || n < 0) return "0h 0m";
        const h = Math.floor(n);
        const m = Math.round((n - h) * 60);
        return `${h}시간 ${m}분`;
    },

    fmtH_short(n) {
        const h = Math.floor(n);
        const m = Math.round((n - h) * 60);
        return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    },

    fmtLeave(days) {
        if (days <= 0) return "0개";
        return `${days.toFixed(3)}개`;
    },

    addTime(baseDate, hoursToAdd) {
        const d = new Date(baseDate);
        const totalMins = (hoursToAdd + CONFIG.LUNCH_DURATION) * 60; // 점심 포함
        d.setMinutes(d.getMinutes() + totalMins);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },

    getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    getSunday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? 0 : 7);
        return new Date(d.setDate(diff));
    },

    getFriday(mondayDate) {
        const d = new Date(mondayDate);
        d.setDate(d.getDate() + 4);
        return d;
    },

    formatDate(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    isToday(dateStr) {
        const today = new Date();
        const todayStr = this.formatDate(today);
        return dateStr === todayStr;
    },

    isFuture(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        return target > today;
    },

    calcWorkingDays(startStr, endStr, holidays) {
        let start = new Date(startStr);
        const end = new Date(endStr);
        let count = 0;
        while (start <= end) {
            const d = start.getDay();
            const ymd = this.formatDate(start);
            if (d >= 1 && d <= 5 && !holidays.has(ymd)) count++;
            start.setDate(start.getDate() + 1);
        }
        return count;
    },

    getWeekdayDates(mondayDateStr) {
        const monday = new Date(mondayDateStr);
        const dates = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(this.formatDate(d));
        }
        return dates;
    },

    getWeekendDates(mondayDateStr) {
        const monday = new Date(mondayDateStr);
        const dates = [];
        for (let i = 5; i <= 6; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(this.formatDate(d));
        }
        return dates;
    },

    /**
     * 보상휴가 시간을 연차/반차/반반차로 분해
     * @param {number} hours - 보상휴가 시간 (예: 7)
     * @returns {object} - { annual: 0, half: 1, quarter: 1, remainder: 1 }
     */
    decomposeLeaveHours(hours) {
        if (hours <= 0) return { annual: 0, half: 0, quarter: 0, remainder: 0 };

        const { ANNUAL, HALF, QUARTER } = CONFIG.LEAVE_UNITS;
        let remaining = hours;

        const annual = Math.floor(remaining / ANNUAL);
        remaining = remaining % ANNUAL;

        const half = Math.floor(remaining / HALF);
        remaining = remaining % HALF;

        const quarter = Math.floor(remaining / QUARTER);
        remaining = remaining % QUARTER;

        return {
            annual,
            half,
            quarter,
            remainder: Math.round(remaining * 10) / 10 // 소수점 1자리
        };
    },

    /**
     * 분해된 휴가를 텍스트로 포맷
     * @param {object} decomposed - decomposeLeaveHours 결과
     * @returns {string} - "연차 1개, 반차 1개, 1시간 감소"
     */
    formatDecomposedLeave(decomposed) {
        const parts = [];
        if (decomposed.annual > 0) parts.push(`연차 ${decomposed.annual}개`);
        if (decomposed.half > 0) parts.push(`반차 ${decomposed.half}개`);
        if (decomposed.quarter > 0) parts.push(`반반차 ${decomposed.quarter}개`);
        if (decomposed.remainder > 0) parts.push(`${decomposed.remainder}시간 감소`);

        return parts.length > 0 ? parts.join(' + ') : '없음';
    },

    /**
     * 시간 입력 자동 포맷
     * "930" → "09:30", "18" → "18:00", "9" → "09:00"
     * @param {string} input - 사용자 입력
     * @returns {string} - 포맷된 시간 (HH:mm)
     */
    autoFormatTime(input) {
        if (!input) return '';
        
        // 이미 콜론이 있으면 기본 정리만
        if (input.includes(':')) {
            const [h, m] = input.split(':');
            const hour = parseInt(h, 10);
            const min = parseInt(m, 10) || 0;
            if (isNaN(hour) || hour < 0 || hour > 23) return input;
            return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        }

        // 숫자만 있는 경우
        const digits = input.replace(/\D/g, '');
        if (!digits) return '';

        let hour, min;
        if (digits.length === 1) {
            // "9" → "09:00"
            hour = parseInt(digits, 10);
            min = 0;
        } else if (digits.length === 2) {
            // "18" → "18:00", "09" → "09:00"
            hour = parseInt(digits, 10);
            min = 0;
        } else if (digits.length === 3) {
            // "930" → "09:30"
            hour = parseInt(digits.substring(0, 1), 10);
            min = parseInt(digits.substring(1), 10);
        } else if (digits.length >= 4) {
            // "0930" → "09:30", "1830" → "18:30"
            hour = parseInt(digits.substring(0, 2), 10);
            min = parseInt(digits.substring(2, 4), 10);
        }

        if (isNaN(hour) || hour < 0 || hour > 23) return input;
        if (isNaN(min) || min < 0 || min > 59) min = 0;

        return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
};
