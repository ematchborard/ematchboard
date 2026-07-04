import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext (Cloudflare) の設定。まずは最小構成。
// トラフィックが増えたら R2/KV の incremental cache 追加を検討
// (現状は pandascore.ts のプロセス内5分キャッシュでAPI負荷を抑えている)
export default defineCloudflareConfig();
