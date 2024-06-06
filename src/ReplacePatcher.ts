import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModBootJsonAddonPlugin, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import type {SC2DataInfo} from "../../../dist-BeforeSC2/SC2DataInfoCache";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import {isNil} from "lodash";

interface ReplaceInfo {
    addonName: string;
    mod: ModInfo;
    modZip: ModZipReader;
}

export interface ReplaceParamsItem {
    from: string;
    to: string;
    fileName: string;
    debug?: boolean;
    all?: boolean;
}

export interface ReplaceParamsItemTwee {
    passageName: string;
    from: string;
    to: string;
    debug?: boolean;
    all?: boolean;
}

export interface ReplaceParams {
    js?: ReplaceParamsItem[];
    css?: ReplaceParamsItem[];
    twee?: ReplaceParamsItemTwee[];
}

export class ReplacePatcher implements AddonPluginHookPointEx {
    private log: LogWrapper;

    constructor(
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.log = gModUtils.getLogger();
    }

    info: Map<string, ReplaceInfo> = new Map<string, ReplaceInfo>();

    async registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader) {
        this.info.set(mod.name, {
            addonName,
            mod,
            modZip,
        });
    }

    async afterPatchModToGame() {
        const scOld = this.gSC2DataManager.getSC2DataInfoAfterPatch();
        const sc = scOld.cloneSC2DataInfo();
        for (const [name, ri] of this.info) {
            try {
                await this.do_patch(ri, sc);
            } catch (e: any | Error) {
                console.error(e);
                this.log.error(`[ReplacePatcher]: ${name} ${e?.message ? e.message : e}`);
            }
        }
        this.gModUtils.replaceFollowSC2DataInfo(sc, scOld);
    }

    checkParams(p: any): p is ReplaceParams {
        let c = p && typeof p === 'object';
        if (c && c.js) {
            c = c && Array.isArray(p.js);
            c = c && p.js.every((t: any) => {
                return t.from && typeof t.from === 'string'
                    && t.to && typeof t.to === 'string'
                    && t.fileName && typeof t.fileName === 'string'
                    && (isNil(t.all) || typeof t.all === 'boolean')
                    ;
            });
        }
        if (c && c.css) {
            c = c && Array.isArray(p.css);
            c = c && p.css.every((t: any) => {
                return t.from && typeof t.from === 'string'
                    && t.to && typeof t.to === 'string'
                    && t.fileName && typeof t.fileName === 'string'
                    && (isNil(t.all) || typeof t.all === 'boolean')
                    ;
            });
        }
        if (c && c.twee) {
            c = c && Array.isArray(p.twee);
            c = c && p.twee.every((t: any) => {
                return t.from && typeof t.from === 'string'
                    && t.to && typeof t.to === 'string'
                    && t.passageName && typeof t.passageName === 'string'
                    && (isNil(t.all) || typeof t.all === 'boolean')
                    ;
            });
        }

        return c;
    }

    async do_patch(ri: ReplaceInfo, sc: SC2DataInfo) {
        const ad = ri.mod.bootJson.addonPlugin?.find((T: ModBootJsonAddonPlugin) => {
            return T.modName === 'ReplacePatcher'
                && T.addonName === 'ReplacePatcherAddon';
        });
        const patchingModName: string = ri.mod.name;
        if (!ad) {
            // never go there
            console.error('[ReplacePatcher] do_patch() (!ad).', [patchingModName, ri.mod]);
            return;
        }
        const params = ad.params;
        if (!this.checkParams(params)) {
            console.error('[ReplacePatcher] do_patch() (!this.checkParams(p)).', [patchingModName, ri.mod, params]);
            this.log.error(`[ReplacePatcher] do_patch() patch[${patchingModName}] invalid params p: ${ri.mod.name} ${JSON.stringify(params)}`);
            return;
        }
        console.log('[ReplacePatcher] do_patch() start.', [patchingModName, ri.mod]);
        this.log.log(`[ReplacePatcher] do_patch() patch[${patchingModName}] start: ${ri.mod.name}`);
        console.log('params.js', params.js);
        console.log('params.css', params.css);
        console.log('params.twee', params.twee);
        if (params.js) {
            this.patchInReplaceParamsItem(patchingModName, params.js ?? [], sc.scriptFileItems);
            sc.scriptFileItems.back2Array();
        }
        if (params.css) {
            this.patchInReplaceParamsItem(patchingModName, params.css ?? [], sc.styleFileItems);
            sc.styleFileItems.back2Array();
        }
        if (params.twee) {
            this.patchInReplaceParamsItemTwee(patchingModName, params.twee ?? [], sc.passageDataItems);
            sc.passageDataItems.back2Array();
        }
        console.log('[ReplacePatcher] do_patch() done.', [patchingModName, ri.mod]);
        this.log.log(`[ReplacePatcher] do_patch() patch[${patchingModName}] done: ${ri.mod.name}`);
    }

    patchInReplaceParamsItem(patchingModName: string, rpi: ReplaceParamsItem[], sc: SC2DataInfo['scriptFileItems'] | SC2DataInfo['styleFileItems']) {
        for (const rp of rpi) {
            const f = sc.map.get(rp.fileName);
            if (!f) {
                console.error(`[ReplacePatcher] patchInReplaceParamsItem() (!f).`, [patchingModName, rp]);
                this.log.error(`[ReplacePatcher] patchInReplaceParamsItem() patch[${patchingModName}] cannot find file: ${rp.fileName}`);
                continue;
            }
            // falsy value will be false
            const debugFlag = !!rp.debug;
            const all = !!rp.all;
            if (debugFlag) {
                console.log(`[ReplacePatcher] findString :`, rp.fileName, rp.from);
                console.log(`[ReplacePatcher] Before:`, f.content);
            }
            const nn = f.content.indexOf(rp.from);
            if (nn < 0) {
                console.error('[ReplacePatcher] patchInReplaceParamsItem() (f.content.search(rp.from) < 0).', [patchingModName, rp]);
                this.log.error(`[ReplacePatcher] patchInReplaceParamsItem() patch[${patchingModName}] cannot find 'from': ${rp.from} in:${rp.fileName}`);
                continue;
            }
            if (all) {
                f.content = f.content.replaceAll(rp.from, rp.to);
            } else {
                f.content = f.content.replace(rp.from, rp.to);
            }
            if (debugFlag) {
                console.log(`[ReplacePatcher] After:`, f.content);
            }
            console.log('[ReplacePatcher] patchInReplaceParamsItem() done.', [patchingModName, rp]);
            this.log.log(`[ReplacePatcher] patchInReplaceParamsItem() patch[${patchingModName}] done: ${rp.fileName} ${rp.from}`);
        }
    }

    patchInReplaceParamsItemTwee(patchingModName: string, rpi: ReplaceParamsItemTwee[], sc: SC2DataInfo['passageDataItems']) {
        for (const rp of rpi) {
            const f = sc.map.get(rp.passageName);
            if (!f) {
                console.error('[ReplacePatcher] patchInReplaceParamsItemTwee() (!f).', [patchingModName, rp]);
                this.log.error(`[ReplacePatcher] patchInReplaceParamsItemTwee() patch[${patchingModName}] cannot find passageName: ${rp.passageName}`);
                continue;
            }
            // falsy value will be false
            const debugFlag = !!rp.debug;
            const all = !!rp.all;
            if (debugFlag) {
                console.log(`[ReplacePatcher] findString :`, rp.passageName, rp.from);
                console.log(`[ReplacePatcher] Before:`, f.content);
            }
            const nn = f.content.indexOf(rp.from);
            if (nn < 0) {
                console.error('[ReplacePatcher] patchInReplaceParamsItemTwee() (f.content.search(rp.from) < 0).', [patchingModName, rp]);
                this.log.error(`[ReplacePatcher] patchInReplaceParamsItemTwee() patch[${patchingModName}] cannot find 'from': ${rp.from} in:${rp.passageName}`);
                continue;
            }
            if (all) {
                f.content = f.content.replaceAll(rp.from, rp.to);
            } else {
                f.content = f.content.replace(rp.from, rp.to);
            }
            if (debugFlag) {
                console.log(`[ReplacePatcher] After:`, f.content);
            }
            console.log('[ReplacePatcher] patchInReplaceParamsItemTwee() done.', [patchingModName, rp]);
            this.log.log(`[ReplacePatcher] patchInReplaceParamsItemTwee() patch[${patchingModName}] done: ${rp.passageName} ${rp.from}`);
        }
    }

    init() {
        this.gModUtils.getAddonPluginManager().registerAddonPlugin(
            'ReplacePatcher',
            'ReplacePatcherAddon',
            this,
        );
    }
}
