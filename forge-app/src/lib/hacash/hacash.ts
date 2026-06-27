/**
 * Hacash anchoring backend — inscribes a Merkle root onto a genesis HACD via
 * HIP-15 on Hacash mainnet, through a Hacash fullnode's HTTP API.
 *
 * This is real integration code. It builds an inscription transaction on the
 * node, submits it, and confirms it by reading the diamond's engrave records
 * back from the chain. It requires configuration (a reachable fullnode, a funded
 * key, and a genesis diamond); without that it refuses to run rather than
 * fabricating a result.
 *
 * One detail is gated behind confirmation with HACD Labs / Hacash core (tracked
 * as the project's top technical open item): whether HIP-15 inscription can be
 * submitted programmatically via the fullnode API, and under exactly which
 * route. That route is isolated in `buildInscriptionTx()` and overridable via
 * `HACASH_INSCRIBE_PATH` so it can be pointed at the confirmed endpoint without
 * code changes.
 */

import type { AnchorProvider, AnchorReceipt } from "./types";
import { assertValidDiamondName } from "./diamond";

export interface HacashConfig {
  nodeUrl: string;
  privateKey: string;
  genesisDiamond: string;
  /** Fee in HAC for the inscription transaction. */
  fee: string;
  /** Override for the inscription-creation route (see file header). */
  inscribePath: string;
  /** Inscription label prefix; the Merkle root is appended. */
  inscriptionPrefix: string;
}

interface NodeJson {
  ret?: number;
  errmsg?: string;
  hash?: string;
  tx_hash?: string;
  [k: string]: unknown;
}

export class HacashProvider implements AnchorProvider {
  readonly backend = "hacash" as const;
  private readonly cfg: HacashConfig;

  constructor(cfg: HacashConfig) {
    if (!cfg.nodeUrl) throw new Error("HacashProvider: nodeUrl is required");
    if (!cfg.privateKey) throw new Error("HacashProvider: privateKey is required");
    assertValidDiamondName(cfg.genesisDiamond);
    this.cfg = cfg;
  }

  private url(path: string, params: Record<string, string>): string {
    const u = new URL(path.replace(/^\//, ""), ensureTrailingSlash(this.cfg.nodeUrl));
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  }

  private async getJson(path: string, params: Record<string, string>): Promise<NodeJson> {
    const res = await fetch(this.url(path, params), { method: "GET" });
    if (!res.ok) {
      throw new Error(`Hacash node ${path} -> HTTP ${res.status}`);
    }
    const json = (await res.json()) as NodeJson;
    if (typeof json.ret === "number" && json.ret !== 0) {
      throw new Error(`Hacash node ${path} -> ret ${json.ret}: ${json.errmsg ?? "error"}`);
    }
    return json;
  }

  /** Inscription text: a tagged Merkle root, kept short enough for HIP-15. */
  private inscription(root: string): string {
    return `${this.cfg.inscriptionPrefix}${root}`;
  }

  /**
   * Build + submit the HIP-15 inscription transaction. Returns the tx hash.
   * The exact node route is configurable (see file header).
   */
  private async submitInscription(root: string): Promise<string> {
    const json = await this.getJson(this.cfg.inscribePath, {
      diamonds: this.cfg.genesisDiamond,
      inscription: this.inscription(root),
      prikey: this.cfg.privateKey,
      fee: this.cfg.fee,
    });
    const hash = json.tx_hash ?? json.hash;
    if (!hash || typeof hash !== "string") {
      throw new Error("Hacash inscription submitted but no tx hash was returned");
    }
    return hash;
  }

  async anchorRoot(root: string): Promise<AnchorReceipt> {
    if (!/^[0-9a-f]{64}$/i.test(root)) {
      throw new Error("HacashProvider: root must be a 32-byte hex string");
    }
    const txHash = await this.submitInscription(root.toLowerCase());
    return {
      backend: "hacash",
      status: "pending",
      root: root.toLowerCase(),
      diamond: this.cfg.genesisDiamond,
      txHash,
      blockHeight: null,
      anchoredAt: new Date().toISOString(),
      detail: "Inscription submitted to Hacash mainnet; awaiting confirmation.",
    };
  }

  /**
   * Confirm by reading the diamond's engrave records back from the chain and
   * checking our inscription is present.
   */
  async getStatus(receipt: AnchorReceipt): Promise<AnchorReceipt> {
    if (receipt.status === "confirmed") return receipt;
    try {
      const json = await this.getJson("query/diamond/engrave", {
        diamonds: this.cfg.genesisDiamond,
        tx_hash: "true",
      });
      const engravings = extractEngravings(json);
      const target = this.inscription(receipt.root);
      const match = engravings.find((e) => e.inscription === target);
      if (match) {
        return {
          ...receipt,
          status: "confirmed",
          blockHeight: match.height ?? receipt.blockHeight,
          detail: "Inscription confirmed on Hacash mainnet.",
        };
      }
      return receipt; // still pending
    } catch (err) {
      return {
        ...receipt,
        detail: `Status check failed: ${(err as Error).message}`,
      };
    }
  }
}

interface Engraving {
  inscription: string;
  height: number | null;
}

function extractEngravings(json: NodeJson): Engraving[] {
  const list = (json.list ?? json.engravings ?? json.data) as unknown;
  if (!Array.isArray(list)) return [];
  return list.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      inscription: String(r.inscription ?? ""),
      height: typeof r.height === "number" ? r.height : null,
    };
  });
}

function ensureTrailingSlash(s: string): string {
  return s.endsWith("/") ? s : s + "/";
}
