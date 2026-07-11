const { ApplicationCommandOptionType } = require('discord.js')
const { isValidPlayerId } = require('./RenderUtils.js')

// /rank, /rec, /top30, /triangle 공통 옵션 파싱 + 검증.
// 반환:
//   pickedUserId: linked/user_id/steam_id/user 옵션에서 온 ID. 유효하지 않으면 undefined.
//   directScore : steam_id 를 명시적으로 지정한 경우에만 세팅 (resolveScore 를 우회해 라이브 API 로).
//   extras     : extraNames 로 지정한 이름의 값들 { name: value }
function pickUserFromOptions(interaction, extraNames = []) {
    let pickedUserId
    let directScore
    const extras = {}
    for (const opt of interaction.options.data) {
        if (opt.name === 'linked' && opt.type === ApplicationCommandOptionType.String) pickedUserId = opt.value
        else if (opt.name === 'user_id' && opt.type === ApplicationCommandOptionType.String) pickedUserId = opt.value
        else if (opt.name === 'steam_id' && opt.type === ApplicationCommandOptionType.String) { pickedUserId = opt.value; directScore = opt.value }
        else if (opt.name === 'user' && opt.type === ApplicationCommandOptionType.Mentionable) pickedUserId = opt.member?.id ?? opt.value
        else if (extraNames.includes(opt.name)) extras[opt.name] = opt.value
    }
    // 경로 traversal / 잘못된 값 차단 — 실패 시 옵션 무시하고 호출자 본인으로 폴백되게 함
    if (pickedUserId && !isValidPlayerId(pickedUserId)) pickedUserId = undefined
    if (directScore && !isValidPlayerId(directScore)) directScore = undefined
    return { pickedUserId, directScore, extras }
}

module.exports = { pickUserFromOptions }
