/* S-T-I-K-S // 3D Battle Arena for bsim.html v1.0 (Engine-Native) */
window.STIKS_BATTLE_3D = (function() {
    'use strict';

    const state = {
        initialized: false,
        scene: null,
        camera: null,
        renderer: null,
        container: null,
        clock: null,
        rafId: null,

        camAngle: 0.0,
        camHeight: 8.6,
        camDist: 12.2,
        shakeTime: 0,
        shakePower: 0,

        envGroup: null,
        unitsGroup: null,
        fxGroup: null,

        unitMeshes: {},
        projectiles: [],
        particles: [],
        waves: [],
        lastLoc: ''
    };

    function is3DEnabled() {
        try {
            return localStorage.getItem('stiks_3d_enabled') !== '0';
        } catch (e) {
            return true;
        }
    }

    function initRenderer(hostEl) {
        if (typeof window.THREE === 'undefined') return false;

        if (!state.initialized) {
            state.scene = new THREE.Scene();
            state.scene.background = new THREE.Color(0x0b0f17);

            const w = Math.max(280, hostEl.clientWidth || 500);
            const h = Math.max(210, hostEl.clientHeight || 250);

            state.camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 120);
            state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            state.renderer.setSize(w, h);

            state.clock = new THREE.Clock();

            const amb = new THREE.AmbientLight(0xffffff, 1.45);
            const dir = new THREE.DirectionalLight(0xffffff, 1.0);
            dir.position.set(10, 20, 12);
            state.scene.add(amb, dir);

            state.envGroup = new THREE.Group();
            state.unitsGroup = new THREE.Group();
            state.fxGroup = new THREE.Group();
            state.scene.add(state.envGroup, state.unitsGroup, state.fxGroup);

            state.initialized = true;
        }

        if (state.renderer.domElement.parentNode !== hostEl) {
            hostEl.appendChild(state.renderer.domElement);
        }
        state.container = hostEl;
        onResize();
        startLoop();
        return true;
    }

    function onResize() {
        if (!state.initialized || !state.container || !state.renderer || !state.camera) return;
        const w = Math.max(280, state.container.clientWidth);
        const h = Math.max(200, state.container.clientHeight);
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(w, h);
    }

    window.addEventListener('resize', onResize);

    function buildEnvironment(loc) {
        while (state.envGroup.children.length > 0) {
            state.envGroup.remove(state.envGroup.children);
        }

        const isPark = loc === 'park';
        const isRuins = loc === 'ruins';
        const floorCol = isPark ? 0x182b20 : (isRuins ? 0x261a1a : 0x232b38);
        const rimCol = isPark ? 0x22c55e : (isRuins ? 0xef4444 : 0x64748b);

        const groundGeom = new THREE.BoxGeometry(15.5, 0.3, 8.6);
        const ground = new THREE.Mesh(groundGeom, new THREE.MeshBasicMaterial({ color: floorCol }));
        ground.position.y = -0.16;

        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(groundGeom),
            new THREE.LineBasicMaterial({ color: rimCol })
        );
        edges.position.y = -0.16;
        state.envGroup.add(ground, edges);

        // Разделительная линия ближнего боя (зона УПОР)
        const midLine = new THREE.Mesh(
            new THREE.PlaneGeometry(0.12, 8.2),
            new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
        );
        midLine.rotation.x = -Math.PI / 2;
        midLine.position.set(-2.4, 0.01, 0);
        state.envGroup.add(midLine);

        // Декорации по реальному st.loc ('city' / 'ruins' / 'park')
        const decoCoords = [[-6.5, -3.4], [6.5, -3.4], [-6.5, 3.4], [6.5, 3.4], [0, -3.7], [0, 3.7]];
        decoCoords.forEach(([dx, dz], i) => {
            if (isPark) {
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.1, 8), new THREE.MeshBasicMaterial({ color: 0x451a03 }));
                trunk.position.set(dx, 0.55, dz);
                const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), new THREE.MeshBasicMaterial({ color: 0x15803d }));
                crown.position.set(dx, 1.35, dz);
                state.envGroup.add(trunk, crown);
            } else {
                const h = 1.1 + (i % 3) * 0.55;
                const bGeom = new THREE.BoxGeometry(1.1, h, 1.1);
                const blk = new THREE.Mesh(bGeom, new THREE.MeshBasicMaterial({ color: isRuins ? 0x3f2323 : 0x334155 }));
                blk.position.set(dx, h * 0.5, dz);
                const bEdge = new THREE.LineSegments(new THREE.EdgesGeometry(bGeom), new THREE.LineBasicMaterial({ color: 0x0f172a }));
                bEdge.position.copy(blk.position);
                state.envGroup.add(blk, bEdge);
            }
        });

        state.lastLoc = loc || 'city';
    }

    function createUnitMesh(unit, isAlly, isTurn) {
        const grp = new THREE.Group();

        const archKey = unit && (unit.archKey || unit.arch || '');
        const isKvaz = Boolean(archKey.includes('kvaz') || (unit && unit.isKvaz));
        const isInf = Boolean((archKey === 'infected' || archKey === 'legend_z' || (unit && (unit.asInfected || unit.isInfected))) && !isKvaz);
        const isScrubber = Boolean(unit && (unit.isScrubber || String(unit.name || '').includes('Скреббер')));
        const rank = Number((unit && unit.rank) || 0);

        const sc = isAlly
            ? (isKvaz ? 1.24 : 1.0)
            : (isScrubber ? 1.48 : (rank >= 8 ? 1.32 : (rank >= 5 ? 1.15 : 0.95)));

        const coatCol = isAlly
            ? (isInf ? 0xdc2626 : (isKvaz ? 0x9333ea : 0x16a34a))
            : (isScrubber ? 0xf59e0b : (unit && unit.isHuman ? 0xd97706 : (rank >= 7 ? 0xb91c1c : (rank >= 4 ? 0x0284c7 : 0x65a30d))));
        const headCol = isAlly
            ? (isInf ? 0xa3e635 : (isKvaz ? 0xd8b4fe : 0xfde68a))
            : (unit && unit.isHuman ? 0xfde68a : 0x4d7c0f);

        const fig = new THREE.Group();
        fig.scale.set(sc, sc, sc);

        const legGeom = new THREE.BoxGeometry(0.17, 0.48, 0.19);
        const legMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
        const legL = new THREE.Mesh(legGeom, legMat); legL.position.set(-0.14, 0.25, 0);
        const legR = new THREE.Mesh(legGeom, legMat); legR.position.set(0.14, 0.25, 0);

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.56, 0.28), new THREE.MeshBasicMaterial({ color: coatCol }));
        torso.position.y = 0.76;
        const torsoEdge = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(0.51, 0.57, 0.29)),
            new THREE.LineBasicMaterial({ color: 0x090d16 })
        );
        torsoEdge.position.copy(torso.position);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: headCol }));
        head.position.y = 1.22;

        const eyes = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.06, 0.04),
            new THREE.MeshBasicMaterial({ color: isAlly ? 0x38bdf8 : (isScrubber ? 0xff0055 : 0xfef08a) })
        );
        eyes.position.set(0, 1.24, 0.16);

        const armGeom = new THREE.BoxGeometry(0.14, 0.46, 0.15);
        const armMat = new THREE.MeshBasicMaterial({ color: coatCol });
        const armL = new THREE.Mesh(armGeom, armMat); armL.position.set(-0.34, 0.76, 0.08); armL.rotation.x = -0.45;
        const armR = new THREE.Mesh(armGeom, armMat); armR.position.set(0.34, 0.76, 0.12); armR.rotation.x = -0.65;

        fig.add(legL, legR, torso, torsoEdge, head, eyes, armL, armR);

        const hasGun = Boolean(isAlly && unit && unit.weap && unit.weap.isGun);
        if (hasGun) {
            const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.74), new THREE.MeshBasicMaterial({ color: 0xf1f5f9 }));
            gun.position.set(0.28, 0.72, 0.36);
            fig.add(gun);
        } else if (isAlly && unit && unit.weap && !isInf) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.62), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
            blade.position.set(0.3, 0.72, 0.32);
            fig.add(blade);
        } else {
            const clawL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 5), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
            clawL.rotation.x = Math.PI / 2; clawL.position.set(-0.34, 0.58, 0.36);
            const clawR = clawL.clone(); clawR.position.x = 0.34;
            fig.add(clawL, clawR);
        }

        // Союзники смотрят вправо (+X), враги влево (-X)
        fig.rotation.y = isAlly ? Math.PI / 2 : -Math.PI / 2;
        grp.add(fig);

        // Кольцо статуса под ногами (ход / оглушение / дебаф / команда)
        let ringCol = isAlly ? 0x4ade80 : 0xef4444;
        if (isTurn) ringCol = 0xfacc15;
        else if (!isAlly && unit && unit.stun > 0) ringCol = 0xfacc15;
        else if (!isAlly && unit && unit.debuff > 0) ringCol = 0x38bdf8;

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.48 * sc, 0.64 * sc, 24),
            new THREE.MeshBasicMaterial({ color: ringCol, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        grp.add(ring);

        // 3D-полоска ОЗ над головой
        const hpRatio = Math.max(0, Math.min(1, (unit.hp || 0) / Math.max(1, unit.maxHp || 100)));
        const barW = 0.92 * sc;
        const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(barW, 0.11), new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.DoubleSide }));
        hpBg.position.set(0, 1.58 * sc, 0);
        const hpFill = new THREE.Mesh(
            new THREE.PlaneGeometry(Math.max(0.03, barW * hpRatio), 0.075),
            new THREE.MeshBasicMaterial({ color: isAlly ? 0x22c55e : 0xef4444, side: THREE.DoubleSide })
        );
        hpFill.position.set(-(barW * (1 - hpRatio)) * 0.5, 1.58 * sc, 0.01);
        grp.add(hpBg, hpFill);

        grp.userData.fig = fig;
        return grp;
    }

    function spawnTracer(fromPos, toPos, colorHex) {
        if (!state.fxGroup) return;
        const start = new THREE.Vector3(fromPos.x, 0.9, fromPos.z);
        const end = new THREE.Vector3(toPos.x, 0.9, toPos.z);
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 8, 8),
            new THREE.MeshBasicMaterial({ color: colorHex || 0xfacc15 })
        );
        bullet.position.copy(start);
        state.fxGroup.add(bullet);
        state.projectiles.push({ mesh: bullet, start, end, progress: 0, speed: 6.0 });
    }

    function spawnHitSparks(pos, colorHex, count) {
        if (!state.fxGroup) return;
        const n = count || 12;
        for (let i = 0; i < n; i++) {
            const p = new THREE.Mesh(
                new THREE.BoxGeometry(0.11, 0.11, 0.11),
                new THREE.MeshBasicMaterial({ color: colorHex || 0xef4444 })
            );
            p.position.set(pos.x, 0.85, pos.z);
            const ang = Math.random() * Math.PI * 2;
            const spd = 1.4 + Math.random() * 3.4;
            state.fxGroup.add(p);
            state.particles.push({
                mesh: p,
                vx: Math.cos(ang) * spd,
                vy: 1.6 + Math.random() * 2.8,
                vz: Math.sin(ang) * spd,
                life: 0.42 + Math.random() * 0.2
            });
        }
        state.shakeTime = 0.2;
        state.shakePower = 0.2;
    }

    function spawnDarWave(pos, colorHex) {
        if (!state.fxGroup) return;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.25, 0.45, 28),
            new THREE.MeshBasicMaterial({ color: colorHex || 0xa855f7, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, 0.14, pos.z);
        state.fxGroup.add(ring);
        state.waves.push({ mesh: ring, life: 0.55, maxLife: 0.55 });
    }

    function syncBattleScene() {
        const CORE = window.STIKS_COMBAT_CORE;
        const st = CORE && CORE.state;
        const stageEl = document.getElementById('combat-stage');
        if (!st || !stageEl) return;

        let host = document.getElementById('stiks-bsim-3d-host');
        if (!is3DEnabled()) {
            if (host) host.style.display = 'none';
            return;
        }

        if (!host) {
            host = document.createElement('div');
            host.id = 'stiks-bsim-3d-host';
            host.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;';
            stageEl.insertBefore(host, stageEl.firstChild);
        }
        host.style.display = 'block';

        const bgSvg = document.getElementById('stage-bg-svg');
        if (bgSvg) bgSvg.style.opacity = '0';

        if (!initRenderer(host)) return;

        const curLoc = st.loc || 'city';
        if (state.lastLoc !== curLoc || state.envGroup.children.length === 0) {
            buildEnvironment(curLoc);
        }

        const activeKeys = new Set();

        const allies = (Array.isArray(st.allies) && st.allies.length) ? st.allies : (st.player ? [st.player] : []);
        const allyCount = allies.length;
        allies.forEach((al, idx) => {
            if (!al) return;
            const key = al.domId || ('ally_' + idx);
            activeKeys.add(key);

            const zPos = allyCount === 1 ? 0 : ((idx - (allyCount - 1) * 0.5) * 1.45);
            const xPos = -4.2;
            const isTurn = Boolean(!st.finished && st.player && (st.player.domId === al.domId || st.allyIdx === idx));
            const sig = `${al.hp}_${al.maxHp}_${isTurn}_${al.weap ? al.weap.name : ''}`;

            let mesh = state.unitMeshes[key];
            if (!mesh || mesh.userData.sig !== sig) {
                if (mesh) state.unitsGroup.remove(mesh);
                mesh = createUnitMesh(al, true, isTurn);
                mesh.userData.sig = sig;
                mesh.position.set(xPos, 0, zPos);
                state.unitsGroup.add(mesh);
                state.unitMeshes[key] = mesh;
            }
            mesh.visible = al.hp > 0;
            mesh.userData.targetPos = new THREE.Vector3(xPos, 0, zPos);
        });

        const enemies = Array.isArray(st.enemies) ? st.enemies : [];
        const enCount = enemies.length;
        enemies.forEach((en, idx) => {
            if (!en) return;
            const key = 'u-' + (en.id || ('en_' + idx));
            activeKeys.add(key);

            const ratio = en.maxDist > 0 ? Math.max(0, Math.min(1, (Number(en.dist) || 0) / en.maxDist)) : 0;
            const xPos = (Number(en.dist) || 0) <= 0 ? -1.6 : (-1.2 + ratio * 6.6);
            const zPos = enCount === 1 ? 0 : ((idx - (enCount - 1) * 0.5) * 1.32);
            const isTurn = Boolean(!st.finished && st.activeId === key);
            const sig = `${en.hp}_${en.maxHp}_${en.stun || 0}_${en.debuff || 0}_${isTurn}_${en.dead ? 1 : 0}`;

            let mesh = state.unitMeshes[key];
            if (!mesh || mesh.userData.sig !== sig) {
                if (mesh) state.unitsGroup.remove(mesh);
                mesh = createUnitMesh(en, false, isTurn);
                mesh.userData.sig = sig;
                mesh.position.set(xPos, 0, zPos);
                state.unitsGroup.add(mesh);
                state.unitMeshes[key] = mesh;
            }
            mesh.visible = !en.dead;
            mesh.userData.targetPos = new THREE.Vector3(xPos, 0, zPos);
        });

        for (const k of Object.keys(state.unitMeshes)) {
            if (!activeKeys.has(k)) {
                state.unitsGroup.remove(state.unitMeshes[k]);
                delete state.unitMeshes[k];
            }
        }
    }

    function hookBsimActions() {
        const UI = window.BSIM_UI;
        const CORE = window.STIKS_COMBAT_CORE;
        if (!UI || !CORE || UI._battle3dHooked) return;
        UI._battle3dHooked = true;

        const origRenderBattle = UI.renderBattle.bind(UI);
        UI.renderBattle = function() {
            origRenderBattle();
            try { syncBattleScene(); } catch (e) { console.warn('[STIKS_BATTLE_3D]', e); }
        };

        const origActAttack = UI.actAttack.bind(UI);
        UI.actAttack = async function() {
            const st = CORE.state;
            const p = st && st.player;
            const attackerMesh = p ? state.unitMeshes[p.domId || 'u-player'] : null;
            const aliveEn = (st && st.enemies || []).filter(e => !e.dead).sort((a, b) => a.dist - b.dist);
            const trgEn = aliveEn[0];
            const trgMesh = trgEn ? state.unitMeshes['u-' + trgEn.id] : null;

            if (attackerMesh && trgMesh && is3DEnabled()) {
                if (p.weap && p.weap.isGun) {
                    spawnTracer(attackerMesh.position, trgMesh.position, 0xfacc15);
                    spawnHitSparks(trgMesh.position, 0xfbbf24, 10);
                } else {
                    attackerMesh.position.x += 1.6;
                    spawnHitSparks(trgMesh.position, 0x38bdf8, 12);
                }
            }
            await origActAttack();
        };

        const origActSkill = UI.actSkill.bind(UI);
        UI.actSkill = function() {
            const st = CORE.state;
            const p = st && st.player;
            const attackerMesh = p ? state.unitMeshes[p.domId || 'u-player'] : null;
            if (attackerMesh && is3DEnabled()) {
                spawnDarWave(attackerMesh.position, 0x38bdf8);
            }
            origActSkill();
        };

        const origActLearned = UI.actLearned.bind(UI);
        UI.actLearned = async function(idx) {
            const st = CORE.state;
            const p = st && st.player;
            const attackerMesh = p ? state.unitMeshes[p.domId || 'u-player'] : null;
            if (attackerMesh && is3DEnabled()) {
                spawnDarWave(attackerMesh.position, 0xc084fc);
            }
            await origActLearned(idx);
        };

        const origRunEnemies = UI.runEnemiesTurn.bind(UI);
        UI.runEnemiesTurn = async function() {
            const st = CORE.state;
            const p = st && st.player;
            const hpBefore = p ? p.hp : 0;
            await origRunEnemies();
            const curP = CORE.state && CORE.state.player;
            if (curP && curP.hp < hpBefore && is3DEnabled()) {
                const pMesh = state.unitMeshes[curP.domId || 'u-player'];
                if (pMesh) spawnHitSparks(pMesh.position, 0xef4444, 14);
            }
        };
    }

    function startLoop() {
        if (state.rafId) return;
        const tick = () => {
            state.rafId = requestAnimationFrame(tick);
            if (!state.initialized || !is3DEnabled()) return;

            const dt = Math.min(0.1, state.clock ? state.clock.getDelta() : 0.016);
            const t = state.clock ? state.clock.elapsedTime : 0;

            let sx = 0, sz = 0;
            if (state.shakeTime > 0) {
                state.shakeTime -= dt;
                sx = (Math.random() - 0.5) * state.shakePower;
                sz = (Math.random() - 0.5) * state.shakePower;
            }
            state.camera.position.set(sx, state.camHeight, state.camDist + sz);
            state.camera.lookAt(0, 0.45, 0);

            for (const k of Object.keys(state.unitMeshes)) {
                const m = state.unitMeshes[k];
                if (!m) continue;
                if (m.userData.targetPos) m.position.lerp(m.userData.targetPos, Math.min(1, dt * 8));
                if (m.userData.fig) m.userData.fig.position.y = Math.sin(t * 3.6 + k.length) * 0.025;
            }

            for (let i = state.projectiles.length - 1; i >= 0; i--) {
                const pr = state.projectiles[i];
                pr.progress += dt * pr.speed;
                if (pr.progress >= 1) {
                    state.fxGroup.remove(pr.mesh);
                    state.projectiles.splice(i, 1);
                } else {
                    pr.mesh.position.lerpVectors(pr.start, pr.end, pr.progress);
                }
            }

            for (let i = state.particles.length - 1; i >= 0; i--) {
                const pt = state.particles[i];
                pt.life -= dt;
                if (pt.life <= 0) {
                    state.fxGroup.remove(pt.mesh);
                    state.particles.splice(i, 1);
                } else {
                    pt.mesh.position.x += pt.vx * dt;
                    pt.mesh.position.y += pt.vy * dt;
                    pt.mesh.position.z += pt.vz * dt;
                    pt.vy -= 9.5 * dt;
                    pt.mesh.scale.setScalar(Math.max(0.1, pt.life * 1.8));
                }
            }

            for (let i = state.waves.length - 1; i >= 0; i--) {
                const w = state.waves[i];
                w.life -= dt;
                if (w.life <= 0) {
                    state.fxGroup.remove(w.mesh);
                    state.waves.splice(i, 1);
                } else {
                    const p = 1 - (w.life / w.maxLife);
                    w.mesh.scale.setScalar(1 + p * 6.0);
                    w.mesh.material.opacity = 1 - p;
                }
            }

            state.renderer.render(state.scene, state.camera);
        };
        tick();
    }

    hookBsimActions();
    setTimeout(() => {
        hookBsimActions();
        try { syncBattleScene(); } catch (e) {}
    }, 150);

    return {
        syncBattleScene
    };
})();
