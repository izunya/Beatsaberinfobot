// Discord 임베드 텍스트에서 마크다운/링크 문법을 깨는 문자를 안전하게 처리한다.
// 빈/널 → 기본값 그대로 통과(맵 데이터 없음을 보존하기 위해 호출부에서 ?? '-' 먼저 처리 권장).

// 일반 텍스트(인라인) 용 — '\' '*' '_' '~' '|' '`' '>' 이스케이프
function mdText(s) {
    return String(s ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/([*_~`|>])/g, '\\$1')
}

// 링크 라벨 [여기](url) 안에 들어가는 텍스트 — 대괄호/괄호는 링크 문법을 깨므로 전각으로 치환
// (이스케이프 \[ 도 가능하지만 임베드에선 \ 문자가 그대로 보이는 경우가 있어 전각 치환이 깔끔)
function mdLinkLabel(s) {
    return String(s ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/\[/g, '［').replace(/\]/g, '］')
        .replace(/\(/g, '（').replace(/\)/g, '）')
        .replace(/([*_~`|])/g, '\\$1')
}

// 인라인 코드 `여기` 안에 들어가는 텍스트 — 백틱은 코드 구간을 끊으므로 유사문자로 치환
function inlineCode(s) {
    return String(s ?? '').replace(/`/g, 'ʼ')
}

// 쿼리 파라미터로 들어갈 값 — encodeURIComponent 가 안전
function urlParam(s) {
    return encodeURIComponent(String(s ?? ''))
}

module.exports = { mdText, mdLinkLabel, inlineCode, urlParam }
