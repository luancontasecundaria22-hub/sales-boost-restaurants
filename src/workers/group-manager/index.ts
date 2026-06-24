import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { Api } from 'telegram'

export interface Env {
  TELEGRAM_WEBHOOK_SECRET: string
  TELEGRAM_SESSION_STRING: string
  TELEGRAM_API_ID: string
  TELEGRAM_API_HASH: string
  MARKETING_BOT_USERNAME: string
  VENDAS_BOT_USERNAME: string
  OWNER_TELEGRAM_ID: string
  NOTIFY_URL?: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function createGroupForClient(
  env: Env,
  clientUserId: number,
  companyName: string,
): Promise<{ invite_link: string; chat_id: number }> {
  const client = new TelegramClient(
    new StringSession(env.TELEGRAM_SESSION_STRING),
    Number(env.TELEGRAM_API_ID),
    env.TELEGRAM_API_HASH,
    { connectionRetries: 3, useWSS: true },
  )

  await client.connect()

  try {
    // 1. Create private supergroup
    const createResult = await client.invoke(
      new Api.channels.CreateChannel({
        title: `Sales Boost — ${companyName}`,
        about: 'Seu assistente privado de marketing e vendas.',
        megagroup: true,
        broadcast: false,
      }),
    ) as Api.Updates

    const channel = (createResult as unknown as { chats: Api.Channel[] }).chats[0] as Api.Channel
    if (!channel) throw new Error('Falha ao criar o grupo')

    const chatId = Number(channel.id)

    // 2. Add both bots
    const botsToAdd = [`@${env.MARKETING_BOT_USERNAME}`, `@${env.VENDAS_BOT_USERNAME}`]
    for (const botUsername of botsToAdd) {
      try {
        await client.invoke(
          new Api.channels.InviteToChannel({
            channel,
            users: [botUsername],
          }),
        )
      } catch (e) {
        console.error(`Falha ao adicionar ${botUsername}:`, e)
      }
    }

    // 3. Try to add Luan (owner) — best effort
    try {
      const ownerId = Number(env.OWNER_TELEGRAM_ID)
      if (ownerId && ownerId !== clientUserId) {
        const ownerEntity = await client.getEntity(ownerId)
        await client.invoke(
          new Api.channels.InviteToChannel({
            channel,
            users: [ownerEntity],
          }),
        )
        // Promote Luan to admin
        await client.invoke(
          new Api.channels.EditAdmin({
            channel,
            userId: ownerEntity,
            adminRights: new Api.ChatAdminRights({
              changeInfo: true,
              postMessages: true,
              editMessages: true,
              deleteMessages: true,
              banUsers: true,
              inviteUsers: true,
              pinMessages: true,
              manageCall: true,
              other: true,
            }),
            rank: 'Admin',
          }),
        )
      }
    } catch (e) {
      console.warn('Não foi possível adicionar o owner automaticamente:', e)
    }

    // 4. Generate single-use invite link for client
    const inviteResult = await client.invoke(
      new Api.messages.ExportChatInvite({
        peer: channel,
        usageLimit: 1,
        requestNeeded: false,
        expireDate: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      }),
    ) as Api.ChatInviteExported

    const inviteLink = inviteResult.link
    if (!inviteLink) throw new Error('Falha ao gerar link de convite')

    return { invite_link: inviteLink, chat_id: chatId }
  } finally {
    await client.disconnect()
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) return json({ error: 'Unauthorized' }, 401)

    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    try {
      const body = await req.json() as {
        client_user_id: number
        company_name: string
        company_id: string
      }

      const { client_user_id, company_name, company_id } = body

      if (!client_user_id || !company_name) {
        return json({ error: 'client_user_id e company_name são obrigatórios' }, 400)
      }

      const result = await createGroupForClient(env, client_user_id, company_name)

      console.log(`Grupo criado para empresa ${company_id}: ${result.invite_link}`)

      return json({ ok: true, invite_link: result.invite_link, chat_id: result.chat_id })
    } catch (err) {
      console.error('group-manager error:', err)
      return json({ error: String(err) }, 500)
    }
  },
}
