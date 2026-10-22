// Cloudflare Turnstileのサーバー側検証。投票APIへのボット投稿を防ぐ。
// SITE KEY(公開、クライアント側)とSECRET KEY(非公開、ここでのみ使用)は別物 —
// SECRET KEYは絶対にレスポンスやクライアントコードに含めない。

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function hasTurnstileSecret(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // ローカル開発(next dev)等、SECRET KEY未設定の環境向けのフォールバック。
    // 本番(Cloudflare Workers)で未設定なのは設定漏れなので、そこでは常に拒否する
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;

  let res: Response;
  try {
    res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
  } catch (err) {
    console.error("[turnstile] verify request failed:", err);
    return false;
  }
  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
