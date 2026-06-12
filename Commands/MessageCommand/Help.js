const client = require('../../index.js')
const { Colors, EmbedBuilder } = require('discord.js')

module.exports = {
    name: 'help',
    aliases: ['도움', '도움말', 'ㅗ디ㅔ'],
    description: '사용 가능한 명령어를 안내합니다',
    run: async (client, message) => {
        const p = client.config?.prefix ?? '>'
        const embed = new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle('명령어 안내')
            .setDescription('BeatLeader / ScoreSaber 프로필을 디스코드에서 조회하고 진행 상황을 추적할 수 있습니다.\n슬래시 커맨드 또는 메시지 커맨드 (`' + p + '`) 둘 다 사용 가능합니다.')
            .addFields(
                {
                    name: `🔗 \`/link | ${p}link\``,
                    value: '자신의 BeatLeader 또는 ScoreSaber 플레이어 ID 를 디스코드 계정과 연동합니다. 한 번 연동하면 이후엔 옵션/인자 없이 본인 프로필을 조회할 수 있습니다.\n' +
                        `사용법: \`/link userid:<플레이어 ID>\` · \`${p}link <플레이어 ID>\``,
                },
                {
                    name: `📊 \`/rank | ${p}rank\``,
                    value: '저장된 스냅샷을 기준으로 본인 또는 지정한 유저의 BeatLeader | ScoreSaber 정보를 보여줍니다.\n' +
                        '• 인자 없음 → 본인 (스냅샷 필요)\n' +
                        '• `steam_id` (숫자 17자리) → 해당 SteamID 프로필을 즉시 조회\n' +
                        '• 멘션/Discord ID → 그 유저의 스냅샷',
                },
                {
                    name: `🔄 \`/scan | ${p}scan\``,
                    value: '라이브 API 에서 최신 데이터를 가져와 스냅샷을 갱신합니다. 이전 스냅샷이 있으면 PP/랭킹 변화량과 새로 플레이한 랭크맵을 PP 내림차순으로 보여줍니다.\n' +
                        '• 첫 스캔 → 기준점 저장\n' +
                        '• 이후 스캔 → 차이점 + 신규 랭크맵 reveal',
                },
            )
            .setFooter({ text: client.config?.izuna ?? 'Created By. Izuna_1' })
        await message.channel.send({ embeds: [embed] })
    },
}
