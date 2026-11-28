/* S-T-I-K-S // 3D Visual Engine Module v1.0 (Stage 1: 60x60 Tactical City Map) */
window.STIKS3D = (function() {
    'use strict';

    const CELL_SIZE = 2.0;

    const state = {
        enabled: localStorage.getItem('stiks_3d_enabled') !== '0',
        initialized: false,
        mapBuilt: false,
        mapSeed: '',
        scene: null,
        camera: null,
        renderer: null,
        container: null,
        hudEl: null,
        raycaster: null,
        pointer: null,
        rafId: null,
        clock: null,

        camAngle: Math.PI / 4,
        camPitch: 0.78,
        camDist: 23.0,
        targetCamAngle: Math.PI / 4,
        targetCamDist: 23.0,
        camTarget: null,
        desiredCamTarget: null,

        isDragging: false,
        dragStart: { x: 0, y: 0 },
        lastPointer: { x: 0, y: 0 },
        pinchStartDist: 0,
        pinchStartZoom: 23.0,

        worldGroup: null,
        staticGroup: null,
        dynamicGroup: null,
        fogGroup: null,
        fxGroup: null,
        fogTiles: {},
        lootMeshes: {},
        unitMeshes: {},
        fireEmitters: [],
        waterMeshes: [],
        sporePoints: null,
        squadLight: null,
        hoverMesh: null,

        textures: {},
        materials: {},
        geometries: {},
        lastSyncHash: ''
    };

    function isAvailable() {
        return typeof window.THREE !== 'undefined' && typeof window.STIKS !== 'undefined';
    }

    function gridToWorld(gx, gy) {
        return {
            x: (gx - 29.5) * CELL_SIZE,
            z: (gy - 29.5) * CELL_SIZE
        };
    }

    function worldToGrid(wx, wz) {
        return {
            x: Math.floor((wx / CELL_SIZE) + 30),
            y: Math.floor((wz / CELL_SIZE) + 30)
        };
    }

    function createProceduralTextures() {
        const cAsph = document.createElement('canvas');
        cAsph.width = 256; cAsph.height = 256;
        const ctxA = cAsph.getContext('2d');
        ctxA.fillStyle = '#181c24';
        ctxA.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1800; i++) {
            const v = 18 + ((i * 37) % 24);
            ctxA.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
            ctxA.fillRect((i * 73) % 256, (i * 139) % 256, 2, 2);
        }
        ctxA.strokeStyle = 'rgba(148,163,184,0.14)';
        ctxA.lineWidth = 2;
        ctxA.strokeRect(1, 1, 254, 254);
        ctxA.strokeStyle = 'rgba(7,9,13,0.65)';
        ctxA.lineWidth = 1.5;
        ctxA.beginPath();
        ctxA.moveTo(28, 12); ctxA.lineTo(64, 58); ctxA.lineTo(52, 110);
        ctxA.moveTo(190, 210); ctxA.lineTo(155, 165); ctxA.lineTo(175, 130);
        ctxA.stroke();

        const texAsphalt = new THREE.CanvasTexture(cAsph);
        texAsphalt.wrapS = THREE.RepeatWrapping;
        texAsphalt.wrapT = THREE.RepeatWrapping;
        texAsphalt.repeat.set(60, 60);

        const cConc = document.createElement('canvas');
        cConc.width = 128; cConc.height = 128;
        const ctxC = cConc.getContext('2d');
        ctxC.fillStyle = '#2b323d';
        ctxC.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 600; i++) {
            const v = 35 + ((i * 29) % 28);
            ctxC.fillStyle = `rgb(${v},${v + 4},${v + 9})`;
            ctxC.fillRect((i * 53) % 128, (i * 97) % 128, 2, 2);
        }
        ctxC.fillStyle = '#090c10';
        for (let wy = 16; wy < 110; wy += 36) {
            for (let wx = 14; wx < 110; wx += 36) {
                ctxC.fillRect(wx, wy, 20, 22);
                ctxC.strokeStyle = '#475569';
                ctxC.lineWidth = 1;
                ctxC.strokeRect(wx, wy, 20, 22);
            }
        }
        const texConcrete = new THREE.CanvasTexture(cConc);

        const cPart = document.createElement('canvas');
        cPart.width = 64; cPart.height = 64;
        const ctxP = cPart.getContext('2d');
        const grad = ctxP.createRadialGradient(32, 32, 2, 32, 32, 30);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctxP.fillStyle = grad;
        ctxP.fillRect(0, 0, 64, 64);
        const texParticle = new THREE.CanvasTexture(cPart);

        state.textures = { asphalt: texAsphalt, concrete: texConcrete, particle: texParticle };
    }

    function createSharedResources() {
        createProceduralTextures();

        state.materials = {
            ground: new THREE.MeshStandardMaterial({ map: state.textures.asphalt, roughness: 0.92, metalness: 0.08 }),
            building: new THREE.MeshStandardMaterial({ map: state.textures.concrete, color: 0x64748b, roughness: 0.85, metalness: 0.15 }),
            rubble: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95, metalness: 0.05 }),
            water: new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0c4a6e, emissiveIntensity: 0.45, roughness: 0.2, metalness: 0.6, transparent: true, opacity: 0.86 }),
            cliff: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.98 }),
            fireBase: new THREE.MeshStandardMaterial({ color: 0x7c2d12, emissive: 0xea580c, emissiveIntensity: 0.9, roughness: 0.7 }),
            perimeter: new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
            fogUnknown: new THREE.MeshBasicMaterial({ color: 0x05070b, transparent: true, opacity: 0.92 }),
            fogExplored: new THREE.MeshBasicMaterial({ color: 0x080c14, transparent: true, opacity: 0.48 }),
            hover: new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
        };

        state.geometries = {
            cellPlane: new THREE.PlaneGeometry(CELL_SIZE * 0.96, CELL_SIZE * 0.96),
            fogPlane: new THREE.PlaneGeometry(CELL_SIZE * 1.01, CELL_SIZE * 1.01),
            rubbleChunk: new THREE.DodecahedronGeometry(0.32, 0),
            crateBox: new THREE.BoxGeometry(0.66, 0.52, 0.66),
            crateLid: new THREE.BoxGeometry(0.72, 0.12, 0.72)
        };
    }

    function initRenderer(hostEl) {
        if (!isAvailable()) return false;

        if (!state.initialized) {
            createSharedResources();

            state.scene = new THREE.Scene();
            state.scene.background = new THREE.Color(0x070a10);
            state.scene.fog = new THREE.FogExp2(0x070a10, 0.011);

            const w = Math.max(300, hostEl.clientWidth || 600);
            const h = Math.max(260, hostEl.clientHeight || 420);

            state.camera = new THREE.PerspectiveCamera(42, w / h, 0.5, 220);
            state.camTarget = new THREE.Vector3(0, 0, 0);
            state.desiredCamTarget = new THREE.Vector3(0, 0, 0);

            state.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            state.renderer.setSize(w, h);
            state.renderer.shadowMap.enabled = true;
            state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            state.renderer.toneMappingExposure = 1.15;

            state.raycaster = new THREE.Raycaster();
            state.pointer = new THREE.Vector2();
            state.clock = new THREE.Clock();

            const hemiLight = new THREE.HemisphereLight(0x94a3b8, 0x0f172a, 0.72);
            state.scene.add(hemiLight);

            const dirLight = new THREE.DirectionalLight(0xcbd5e1, 1.05);
            dirLight.position.set(35, 65, 28);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 1024;
            dirLight.shadow.mapSize.height = 1024;
            dirLight.shadow.camera.near = 10;
            dirLight.shadow.camera.far = 160;
            const d = 55;
            dirLight.shadow.camera.left = -d;
            dirLight.shadow.camera.right = d;
            dirLight.shadow.camera.top = d;
            dirLight.shadow.camera.bottom = -d;
            state.scene.add(dirLight);

            state.squadLight = new THREE.PointLight(0xfbbf24, 2.2, 22, 1.4);
            state.squadLight.position.set(0, 4.5, 0);
            state.scene.add(state.squadLight);

            state.worldGroup = new THREE.Group();
            state.staticGroup = new THREE.Group();
            state.dynamicGroup = new THREE.Group();
            state.fogGroup = new THREE.Group();
            state.fxGroup = new THREE.Group();

            state.worldGroup.add(state.staticGroup);
            state.worldGroup.add(state.dynamicGroup);
            state.worldGroup.add(state.fogGroup);
            state.worldGroup.add(state.fxGroup);
            state.scene.add(state.worldGroup);

            const groundMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(60 * CELL_SIZE, 60 * CELL_SIZE),
                state.materials.ground
            );
            groundMesh.rotation.x = -Math.PI / 2;
            groundMesh.receiveShadow = true;
            groundMesh.name = 'ground_plane';
            state.worldGroup.add(groundMesh);

            state.hoverMesh = new THREE.Mesh(state.geometries.cellPlane, state.materials.hover);
            state.hoverMesh.rotation.x = -Math.PI / 2;
            state.hoverMesh.position.y = 0.04;
            state.hoverMesh.visible = false;
            state.worldGroup.add(state.hoverMesh);

            initSpores();
            bindInputEvents(state.renderer.domElement);
            state.initialized = true;
        }

        if (state.renderer.domElement.parentNode !== hostEl) {
            hostEl.appendChild(state.renderer.domElement);
        }
        state.container = hostEl;
        ensureHudOverlay(hostEl);
        onResize();
        startLoop();
        return true;
    }

    function initSpores() {
        const count = 420;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 116;
            positions[i * 3 + 1] = 0.4 + Math.random() * 8.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 116;

            const isAmber = Math.random() > 0.35;
            colors[i * 3] = isAmber ? 0.96 : 0.22;
            colors[i * 3 + 1] = isAmber ? 0.65 : 0.85;
            colors[i * 3 + 2] = isAmber ? 0.14 : 0.55;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.36,
            map: state.textures.particle,
            vertexColors: true,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        state.sporePoints = new THREE.Points(geom, mat);
        state.fxGroup.add(state.sporePoints);
    }

    function ensureHudOverlay(hostEl) {
        if (!state.hudEl) {
            const hud = document.createElement('div');
            hud.id = 'stiks-3d-hud';
            hud.style.cssText = 'position:absolute;top:8px;right:8px;z-index:18;display:flex;gap:4px;pointer-events:auto;';
            hud.innerHTML = `
                <button type="button" onclick="STIKS3D.rotateCamera(-0.4)" title="Повернуть камеру влево (Q)" style="background:rgba(15,23,42,0.82);border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">↺</button>
                <button type="button" onclick="STIKS3D.rotateCamera(0.4)" title="Повернуть камеру вправо (E)" style="background:rgba(15,23,42,0.82);border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">↻</button>
                <button type="button" onclick="STIKS3D.zoomCamera(-3.5)" title="Приблизить" style="background:rgba(15,23,42,0.82);border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">+</button>
                <button type="button" onclick="STIKS3D.zoomCamera(3.5)" title="Отдалить" style="background:rgba(15,23,42,0.82);border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">−</button>
                <button type="button" onclick="STIKS3D.resetCamera()" title="Центрировать на отряде" style="background:rgba(15,23,42,0.82);border:1px solid #10b981;color:#34d399;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">🎯</button>
            `;
            state.hudEl = hud;
        }
        if (state.hudEl.parentNode !== hostEl) {
            hostEl.appendChild(state.hudEl);
        }
    }

    function rotateCamera(delta) {
        state.targetCamAngle += delta;
    }

    function zoomCamera(delta) {
        state.targetCamDist = Math.max(11, Math.min(48, state.targetCamDist + delta));
    }

    function resetCamera() {
        state.targetCamAngle = Math.PI / 4;
        state.targetCamDist = 23.0;
        const p = getLeaderPlayer();
        if (p && state.desiredCamTarget) {
            const pos = gridToWorld(p.x, p.y);
            state.desiredCamTarget.set(pos.x, 0, pos.z);
        }
    }

    function getLeaderPlayer() {
        const s = window.STIKS && STIKS.db ? STIKS.db.session : null;
        if (!s || !s.players || !s.players.length) return null;
        return s.players[s.turnIdx] || s.players.find(pl => !pl.dead) || s.players[0];
    }

    function onResize() {
        if (!state.initialized || !state.container || !state.renderer || !state.camera) return;
        const w = Math.max(280, state.container.clientWidth);
        const h = Math.max(240, state.container.clientHeight);
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(w, h);
    }

    window.addEventListener('resize', onResize);

    // --- PART 2: 3D CITY BUILDER, ENTITIES, RAYCASTING & ENGINE HOOKS ---

    function clearGroup(grp) {
        if (!grp) return;
        while (grp.children.length > 0) {
            const obj = grp.children[0];
            grp.remove(obj);
        }
    }

    function hashCoord(x, y, salt) {
        let h = ((x * 374761393) + (y * 668265263) + (salt || 0) * 1442695041) | 0;
        h = (h ^ (h >>> 13)) * 1274126177;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    function buildCity3D(session) {
        if (!session || !session.grid || !state.initialized) return;

        clearGroup(state.staticGroup);
        clearGroup(state.fogGroup);
        state.fogTiles = {};
        state.fireEmitters = [];
        state.waterMeshes = [];

        const grid = session.grid;
        const size = grid.length || 60;

        // Perimeter extraction strip (outer border)
        const perimGeom = new THREE.BoxGeometry(size * CELL_SIZE, 0.08, 0.35);
        const pNorth = new THREE.Mesh(perimGeom, state.materials.perimeter);
        pNorth.position.set(0, 0.05, -HALF_WORLD + 0.2);
        const pSouth = new THREE.Mesh(perimGeom, state.materials.perimeter);
        pSouth.position.set(0, 0.05, HALF_WORLD - 0.2);
        const pWest = new THREE.Mesh(perimGeom, state.materials.perimeter);
        pWest.rotation.y = Math.PI / 2;
        pWest.position.set(-HALF_WORLD + 0.2, 0.05, 0);
        const pEast = new THREE.Mesh(perimGeom, state.materials.perimeter);
        pEast.rotation.y = Math.PI / 2;
        pEast.position.set(HALF_WORLD - 0.2, 0.05, 0);
        state.staticGroup.add(pNorth, pSouth, pWest, pEast);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = grid[y][x];
                if (!cell) continue;
                const pos = gridToWorld(x, y);

                // Fog of war tile
                const fogMesh = new THREE.Mesh(state.geometries.fogPlane, state.materials.fogUnknown);
                fogMesh.rotation.x = -Math.PI / 2;
                fogMesh.position.set(pos.x, 4.6, pos.z);
                state.fogGroup.add(fogMesh);
                state.fogTiles[`${x}_${y}`] = fogMesh;

                // Terrain & Obstacles
                if (cell.type === 'barrier') {
                    const bType = cell.barrierType || 'Руины';
                    const r1 = hashCoord(x, y, 1);
                    const r2 = hashCoord(x, y, 2);

                    if (bType === 'Скала') {
                        // Ruined multi-story concrete building
                        const h = 2.6 + r1 * 3.8;
                        const w = CELL_SIZE * (0.82 + r2 * 0.14);
                        const d = CELL_SIZE * (0.82 + hashCoord(x, y, 3) * 0.14);
                        const bMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), state.materials.building);
                        bMesh.position.set(pos.x, h / 2, pos.z);
                        bMesh.castShadow = true;
                        bMesh.receiveShadow = true;
                        state.staticGroup.add(bMesh);

                        // Broken roof slab / rebar detail
                        const slab = new THREE.Mesh(
                            new THREE.BoxGeometry(w * 0.78, 0.16, d * 0.72),
                            state.materials.rubble
                        );
                        slab.position.set(pos.x + (r1 - 0.5) * 0.25, h + 0.06, pos.z);
                        slab.rotation.z = (r2 - 0.5) * 0.28;
                        state.staticGroup.add(slab);
                    } else if (bType === 'Руины') {
                        const chunks = 3 + Math.floor(r1 * 3);
                        for (let c = 0; c < chunks; c++) {
                            const cr = hashCoord(x, y, 10 + c);
                            const scale = 0.7 + cr * 1.1;
                            const m = new THREE.Mesh(state.geometries.rubbleChunk, state.materials.rubble);
                            m.scale.set(scale, scale * (0.6 + cr * 0.7), scale);
                            m.position.set(
                                pos.x + (hashCoord(x, y, 20 + c) - 0.5) * 1.1,
                                0.22 * scale,
                                pos.z + (hashCoord(x, y, 30 + c) - 0.5) * 1.1
                            );
                            m.rotation.set(cr * 3, r2 * 3, r1 * 3);
                            m.castShadow = true;
                            m.receiveShadow = true;
                            state.staticGroup.add(m);
                        }
                    } else if (bType === 'Водоем') {
                        const wMesh = new THREE.Mesh(
                            new THREE.BoxGeometry(CELL_SIZE * 0.98, 0.14, CELL_SIZE * 0.98),
                            state.materials.water
                        );
                        wMesh.position.set(pos.x, 0.05, pos.z);
                        wMesh.userData = { baseY: 0.05, phase: r1 * Math.PI * 2 };
                        state.staticGroup.add(wMesh);
                        state.waterMeshes.push(wMesh);
                    } else if (bType === 'Обрыв') {
                        const pit = new THREE.Mesh(
                            new THREE.BoxGeometry(CELL_SIZE * 0.94, 0.18, CELL_SIZE * 0.94),
                            state.materials.cliff
                        );
                        pit.position.set(pos.x, 0.02, pos.z);
                        state.staticGroup.add(pit);
                    } else if (bType === 'Пожар') {
                        const embers = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.55, 0.72, 0.22, 8),
                            state.materials.fireBase
                        );
                        embers.position.set(pos.x, 0.11, pos.z);
                        state.staticGroup.add(embers);

                        const fireLight = new THREE.PointLight(0xf97316, 1.6, 8, 1.6);
                        fireLight.position.set(pos.x, 1.1, pos.z);
                        state.staticGroup.add(fireLight);

                        // Flame & smoke particles
                        const pCount = 14;
                        const pPos = new Float32Array(pCount * 3);
                        for (let i = 0; i < pCount; i++) {
                            pPos[i * 3] = pos.x + (Math.random() - 0.5) * 0.6;
                            pPos[i * 3 + 1] = 0.2 + Math.random() * 1.8;
                            pPos[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.6;
                        }
                        const pGeom = new THREE.BufferGeometry();
                        pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
                        const pMat = new THREE.PointsMaterial({
                            color: 0xfb923c,
                            size: 0.42,
                            map: state.textures.particle,
                            transparent: true,
                            opacity: 0.85,
                            depthWrite: false,
                            blending: THREE.AdditiveBlending
                        });
                        const pts = new THREE.Points(pGeom, pMat);
                        state.staticGroup.add(pts);
                        state.fireEmitters.push({ points: pts, light: fireLight, baseX: pos.x, baseZ: pos.z, phase: r1 * 6.28 });
                    }
                }
            }
        }

        state.mapBuilt = true;
    }

    function getLootColor(lootObj) {
        if (!lootObj) return 0xfacc15;
        if (lootObj.easterId) return 0xf43f5e;
        const t = lootObj.type || '';
        if (t === 'weapon') return 0xef4444;
        if (t === 'armor') return 0x3b82f6;
        if (t === 'supply') return 0x10b981;
        if (t === 'valuable') return 0xa855f7;
        return 0xfacc15;
    }

    function createCrateMesh(colorHex) {
        const grp = new THREE.Group();
        const matBox = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            emissive: colorHex,
            emissiveIntensity: 0.45,
            roughness: 0.45,
            metalness: 0.55
        });
        const matTrim = new THREE.MeshBasicMaterial({ color: colorHex });
        const box = new THREE.Mesh(state.geometries.crateBox, matBox);
        box.position.y = 0.28;
        box.castShadow = true;
        const lid = new THREE.Mesh(state.geometries.crateLid, matTrim);
        lid.position.y = 0.56;
        grp.add(box, lid);
        return grp;
    }

    function createSurvivorMesh(player, isActive) {
        const grp = new THREE.Group();
        const hasCar = player && player.car && player.car.hp > 0;
        const roleColor = player.isInfected ? 0xef4444 : (player.isQuaz ? 0xa855f7 : (isActive ? 0x10b981 : 0x38bdf8));

        if (hasCar) {
            const carName = (player.car.name || '').toLowerCase();
            let bodyColor = 0x94a3b8;
            let len = 1.45, wid = 0.85, hgt = 0.52;
            if (carName.includes('урал')) {
                bodyColor = 0x3f6212; len = 1.75; wid = 0.96; hgt = 0.72;
            } else if (carName.includes('tundra')) {
                bodyColor = 0x991b1b; len = 1.62; wid = 0.92; hgt = 0.62;
            }
            const chassis = new THREE.Mesh(
                new THREE.BoxGeometry(wid, hgt, len),
                new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5, metalness: 0.4 })
            );
            chassis.position.y = 0.36;
            chassis.castShadow = true;
            grp.add(chassis);

            const cabin = new THREE.Mesh(
                new THREE.BoxGeometry(wid * 0.86, hgt * 0.65, len * 0.52),
                new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 })
            );
            cabin.position.set(0, 0.36 + hgt * 0.65, -len * 0.08);
            grp.add(cabin);
        } else {
            // Tactical humanoid figure
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.24, 0.28, 0.85, 10),
                new THREE.MeshStandardMaterial({ color: roleColor, roughness: 0.6 })
            );
            body.position.y = 0.45;
            body.castShadow = true;

            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 10, 10),
                new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.5 })
            );
            head.position.y = 1.05;
            head.castShadow = true;
            grp.add(body, head);

            // Crown of the Chosen indicator
            if (player.hasCrown || (player.inventory && player.inventory.some(i => i && (i.id === 'crown_chosen' || (i.name || '').includes('Корона'))))) {
                const crown = new THREE.Mesh(
                    new THREE.TorusGeometry(0.18, 0.04, 6, 12),
                    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
                );
                crown.rotation.x = Math.PI / 2;
                crown.position.y = 1.32;
                grp.add(crown);
            }
        }

        // Base selection ring
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.46, 0.62, 20),
            new THREE.MeshBasicMaterial({ color: isActive ? 0x34d399 : 0x38bdf8, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        grp.add(ring);

        return grp;
    }

    function createEnemyMesh(zombie) {
        const grp = new THREE.Group();
        const rank = Math.max(1, Math.min(8, zombie.rank || 1));
        const scale = 0.85 + rank * 0.14;
        const color = rank >= 7 ? 0xdc2626 : (rank >= 4 ? 0xea580c : 0x84cc16);

        const torso = new THREE.Mesh(
            new THREE.ConeGeometry(0.32 * scale, 0.95 * scale, 7),
            new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.25,
                roughness: 0.75
            })
        );
        torso.position.y = 0.48 * scale;
        torso.castShadow = true;

        const head = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.2 * scale, 0),
            new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 })
        );
        head.position.y = 1.02 * scale;
        grp.add(torso, head);

        const dangerRing = new THREE.Mesh(
            new THREE.RingGeometry(0.4 * scale, 0.52 * scale, 16),
            new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
        );
        dangerRing.rotation.x = -Math.PI / 2;
        dangerRing.position.y = 0.04;
        grp.add(dangerRing);

        return grp;
    }

    function syncSessionState() {
        if (!state.initialized || !state.enabled) return;
        const s = window.STIKS && STIKS.db ? STIKS.db.session : null;
        if (!s || !s.grid) return;

        // Rebuild city geometry if new run/grid
        const seedSig = `${s.grid.length}_${s.grid[0][0] ? s.grid[0][0].barrierType || s.grid[0][0].type : ''}_${s.seed || ''}`;
        if (!state.mapBuilt || state.mapSeed !== seedSig) {
            state.mapSeed = seedSig;
            buildCity3D(s);
        }

        const leader = getLeaderPlayer();
        const lx = leader ? leader.x : 30;
        const ly = leader ? leader.y : 30;
        const viewRadius = 6;

        // 1. Update Fog of War visibility
        const size = s.grid.length;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = s.grid[y][x];
                const fMesh = state.fogTiles[`${x}_${y}`];
                if (!fMesh || !cell) continue;

                const dist = Math.max(Math.abs(x - lx), Math.abs(y - ly));
                if (dist <= viewRadius) {
                    fMesh.visible = false;
                } else if (cell.explored) {
                    fMesh.visible = true;
                    fMesh.material = state.materials.fogExplored;
                } else {
                    fMesh.visible = true;
                    fMesh.material = state.materials.fogUnknown;
                }
            }
        }

        // 2. Sync Loot Crates
        const activeLootKeys = new Set();
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = s.grid[y][x];
                if (!cell || !cell.loot || cell.loot.length === 0) continue;
                const dist = Math.max(Math.abs(x - lx), Math.abs(y - ly));
                if (!cell.explored && dist > viewRadius) continue;

                const key = `${x}_${y}`;
                activeLootKeys.add(key);
                if (!state.lootMeshes[key]) {
                    const crate = createCrateMesh(getLootColor(cell.loot[0]));
                    const pos = gridToWorld(x, y);
                    crate.position.set(pos.x, 0, pos.z);
                    crate.userData = { baseY: 0, phase: (x + y) * 0.7 };
                    state.dynamicGroup.add(crate);
                    state.lootMeshes[key] = crate;
                }
            }
        }
        for (const k of Object.keys(state.lootMeshes)) {
            if (!activeLootKeys.has(k)) {
                state.dynamicGroup.remove(state.lootMeshes[k]);
                delete state.lootMeshes[k];
            }
        }

        // 3. Sync Players, Escort & Enemies
        const activeUnitKeys = new Set();

        (s.players || []).forEach((p, idx) => {
            if (!p || p.dead) return;
            const key = `p_${p.id || idx}`;
            activeUnitKeys.add(key);
            const isAct = idx === s.turnIdx;
            const pos = gridToWorld(p.x, p.y);
            const sig = `${p.car ? p.car.hp : 0}_${p.isInfected}_${p.isQuaz}_${isAct}`;

            let uMesh = state.unitMeshes[key];
            if (!uMesh || uMesh.userData.sig !== sig) {
                if (uMesh) state.dynamicGroup.remove(uMesh);
                uMesh = createSurvivorMesh(p, isAct);
                uMesh.userData.sig = sig;
                uMesh.position.set(pos.x, 0, pos.z);
                state.dynamicGroup.add(uMesh);
                state.unitMeshes[key] = uMesh;
            }
            uMesh.userData.targetPos = new THREE.Vector3(pos.x, 0, pos.z);

            // Escort companions around leader
            if (isAct && Array.isArray(p.escort)) {
                p.escort.forEach((comp, cIdx) => {
                    if (!comp || comp.hp <= 0) return;
                    const cKey = `esc_${idx}_${cIdx}`;
                    activeUnitKeys.add(cKey);
                    const angle = (cIdx / Math.max(1, p.escort.length)) * Math.PI * 2;
                    const ox = Math.cos(angle) * 0.62;
                    const oz = Math.sin(angle) * 0.62;
                    let cMesh = state.unitMeshes[cKey];
                    if (!cMesh) {
                        cMesh = createSurvivorMesh({ isInfected: false }, false);
                        cMesh.scale.set(0.68, 0.68, 0.68);
                        cMesh.position.set(pos.x + ox, 0, pos.z + oz);
                        state.dynamicGroup.add(cMesh);
                        state.unitMeshes[cKey] = cMesh;
                    }
                    cMesh.userData.targetPos = new THREE.Vector3(pos.x + ox, 0, pos.z + oz);
                });
            }
        });

        (s.zombies || []).forEach((z, idx) => {
            if (!z || z.hp <= 0) return;
            const dist = Math.max(Math.abs(z.x - lx), Math.abs(z.y - ly));
            if (dist > viewRadius + 1) return;

            const key = `z_${z.id || idx}`;
            activeUnitKeys.add(key);
            const pos = gridToWorld(z.x, z.y);
            let zMesh = state.unitMeshes[key];
            if (!zMesh) {
                zMesh = createEnemyMesh(z);
                zMesh.position.set(pos.x, 0, pos.z);
                state.dynamicGroup.add(zMesh);
                state.unitMeshes[key] = zMesh;
            }
            zMesh.userData.targetPos = new THREE.Vector3(pos.x, 0, pos.z);
        });

        for (const k of Object.keys(state.unitMeshes)) {
            if (!activeUnitKeys.has(k)) {
                state.dynamicGroup.remove(state.unitMeshes[k]);
                delete state.unitMeshes[k];
            }
        }

        // 4. Center camera & squad lantern on active player
        if (leader) {
            const lPos = gridToWorld(leader.x, leader.y);
            state.desiredCamTarget.set(lPos.x, 0, lPos.z);
            if (state.squadLight) {
                state.squadLight.position.set(lPos.x, 4.8, lPos.z);
            }
        }
    }

    function bindInputEvents(domEl) {
        domEl.addEventListener('pointerdown', (e) => {
            state.isDragging = true;
            state.dragStart.x = e.clientX;
            state.dragStart.y = e.clientY;
            state.lastPointer.x = e.clientX;
            state.lastPointer.y = e.clientY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!state.enabled || !state.initialized) return;
            if (state.isDragging) {
                const dx = e.clientX - state.lastPointer.x;
                state.targetCamAngle -= dx * 0.0085;
                state.lastPointer.x = e.clientX;
                state.lastPointer.y = e.clientY;
            } else if (e.target === domEl) {
                updateHoverCursor(e.clientX, e.clientY);
            }
        });

        window.addEventListener('pointerup', (e) => {
            if (!state.isDragging) return;
            state.isDragging = false;
            const moveDist = Math.hypot(e.clientX - state.dragStart.x, e.clientY - state.dragStart.y);
            if (moveDist < 8 && e.target === domEl) {
                handleMapClick(e.clientX, e.clientY);
            }
        });

        domEl.addEventListener('wheel', (e) => {
            if (!state.enabled) return;
            e.preventDefault();
            zoomCamera(e.deltaY > 0 ? 2.2 : -2.2);
        }, { passive: false });

        // Pinch-to-zoom on touch screens
        domEl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                state.pinchStartDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                state.pinchStartZoom = state.targetCamDist;
            }
        }, { passive: true });

        domEl.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && state.pinchStartDist > 0) {
                const d = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const ratio = state.pinchStartDist / Math.max(10, d);
                state.targetCamDist = Math.max(11, Math.min(48, state.pinchStartZoom * ratio));
            }
        }, { passive: true });

        window.addEventListener('keydown', (e) => {
            if (!state.enabled || !state.initialized) return;
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            if (e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') rotateCamera(-0.35);
            if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') rotateCamera(0.35);
        });
    }

    function raycastGround(clientX, clientY) {
        if (!state.renderer || !state.camera) return null;
        const rect = state.renderer.domElement.getBoundingClientRect();
        state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        state.raycaster.setFromCamera(state.pointer, state.camera);

        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hit = new THREE.Vector3();
        if (state.raycaster.ray.intersectPlane(groundPlane, hit)) {
            const g = worldToGrid(hit.x, hit.z);
            if (g.x >= 0 && g.x < 60 && g.y >= 0 && g.y < 60) return g;
        }
        return null;
    }

    function updateHoverCursor(clientX, clientY) {
        const g = raycastGround(clientX, clientY);
        if (g && state.hoverMesh) {
            const pos = gridToWorld(g.x, g.y);
            state.hoverMesh.position.set(pos.x, 0.05, pos.z);
            state.hoverMesh.visible = true;
        } else if (state.hoverMesh) {
            state.hoverMesh.visible = false;
        }
    }

    function handleMapClick(clientX, clientY) {
        const g = raycastGround(clientX, clientY);
        if (!g || !window.STIKS) return;
        const leader = getLeaderPlayer();
        if (!leader) return;

        const dx = Math.sign(g.x - leader.x);
        const dy = Math.sign(g.y - leader.y);

        if (dx === 0 && dy === 0) {
            if (typeof STIKS.searchCurrentCell === 'function') {
                STIKS.searchCurrentCell();
            }
        } else if (typeof STIKS.movePlayer === 'function') {
            STIKS.movePlayer(dx, dy);
        }
    }

    function startLoop() {
        if (state.rafId) return;
        const tick = () => {
            state.rafId = requestAnimationFrame(tick);
            if (!state.enabled || !state.initialized) return;

            const dt = Math.min(0.1, state.clock ? state.clock.getDelta() : 0.016);
            const t = state.clock ? state.clock.elapsedTime : 0;

            // Smooth camera interpolation
            state.camAngle += (state.targetCamAngle - state.camAngle) * Math.min(1, dt * 10);
            state.camDist += (state.targetCamDist - state.camDist) * Math.min(1, dt * 10);
            state.camTarget.lerp(state.desiredCamTarget, Math.min(1, dt * 8));

            const horiz = Math.cos(state.camPitch) * state.camDist;
            const vert = Math.sin(state.camPitch) * state.camDist;
            state.camera.position.set(
                state.camTarget.x + Math.sin(state.camAngle) * horiz,
                state.camTarget.y + vert,
                state.camTarget.z + Math.cos(state.camAngle) * horiz
            );
            state.camera.lookAt(state.camTarget);

            // Smooth unit movement
            for (const key of Object.keys(state.unitMeshes)) {
                const m = state.unitMeshes[key];
                if (m && m.userData.targetPos) {
                    m.position.lerp(m.userData.targetPos, Math.min(1, dt * 12));
                }
            }

            // Animate loot crates bobbing
            for (const key of Object.keys(state.lootMeshes)) {
                const c = state.lootMeshes[key];
                if (c) {
                    c.rotation.y = t * 1.4 + (c.userData.phase || 0);
                    c.position.y = Math.sin(t * 2.8 + (c.userData.phase || 0)) * 0.08 + 0.08;
                }
            }

            // Animate water shimmer
            for (let i = 0; i < state.waterMeshes.length; i++) {
                const w = state.waterMeshes[i];
                w.position.y = w.userData.baseY + Math.sin(t * 2.2 + w.userData.phase) * 0.025;
            }

            // Animate fire emitters
            for (let i = 0; i < state.fireEmitters.length; i++) {
                const fe = state.fireEmitters[i];
                fe.light.intensity = 1.4 + Math.sin(t * 14 + fe.phase) * 0.45;
                const posArr = fe.points.geometry.attributes.position.array;
                for (let j = 0; j < posArr.length; j += 3) {
                    posArr[j + 1] += dt * 1.3;
                    if (posArr[j + 1] > 2.2) posArr[j + 1] = 0.2;
                }
                fe.points.geometry.attributes.position.needsUpdate = true;
            }

            // Animate floating Hive spores
            if (state.sporePoints) {
                const arr = state.sporePoints.geometry.attributes.position.array;
                for (let i = 0; i < arr.length; i += 3) {
                    arr[i + 1] += Math.sin(t * 0.9 + i) * 0.004;
                    arr[i] += Math.cos(t * 0.6 + i) * 0.003;
                }
                state.sporePoints.geometry.attributes.position.needsUpdate = true;
            }

            state.renderer.render(state.scene, state.camera);
        };
        tick();
    }

    function updateToggleButton() {
        const btn = document.getElementById('btn-2d-3d');
        if (!btn) return;
        if (state.enabled) {
            btn.textContent = '🧊 3D';
            btn.style.borderColor = 'rgba(16,185,129,0.75)';
            btn.style.color = '#34d399';
        } else {
            btn.textContent = '🗺️ 2D';
            btn.style.borderColor = 'rgba(148,163,184,0.45)';
            btn.style.color = '#94a3b8';
        }
    }

    function toggleMode() {
        state.enabled = !state.enabled;
        localStorage.setItem('stiks_3d_enabled', state.enabled ? '1' : '0');
        updateToggleButton();
        if (window.STIKS && typeof STIKS.renderGame === 'function') {
            STIKS.renderGame();
        }
    }

    function mountIntoGameView() {
        updateToggleButton();
        if (!isAvailable()) return;

        const mapFrame = document.querySelector('.v2-map-frame') || document.getElementById('map-grid');
        if (!mapFrame) return;

        const grid2d = mapFrame.querySelector('.v2-grid') || document.getElementById('map-grid');
        let host3d = document.getElementById('stiks-3d-viewport');

        if (!state.enabled) {
            if (host3d) host3d.style.display = 'none';
            if (grid2d && grid2d !== mapFrame) grid2d.style.display = '';
            return;
        }

        if (!host3d) {
            host3d = document.createElement('div');
            host3d.id = 'stiks-3d-viewport';
            host3d.style.cssText = 'position:relative;width:100%;height:340px;min-height:300px;border-radius:10px;overflow:hidden;border:1px solid rgba(56,189,248,0.3);background:#070a10;';
            mapFrame.insertBefore(host3d, mapFrame.firstChild);
        }

        host3d.style.display = 'block';
        if (grid2d && grid2d !== mapFrame) {
            grid2d.style.display = 'none';
        }

        if (initRenderer(host3d)) {
            syncSessionState();
        }
    }

    function hookEngine() {
        if (!window.STIKS) {
            setTimeout(hookEngine, 120);
            return;
        }
        updateToggleButton();
        if (typeof STIKS.renderGame === 'function' && !STIKS._3dHooked) {
            const origRenderGame = STIKS.renderGame.bind(STIKS);
            STIKS.renderGame = function() {
                const res = origRenderGame.apply(this, arguments);
                try {
                    mountIntoGameView();
                } catch (err) {
                    console.warn('[STIKS3D] Render hook warning:', err);
                }
                return res;
            };
            STIKS._3dHooked = true;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookEngine);
    } else {
        hookEngine();
    }

    return {
        toggleMode,
        rotateCamera,
        zoomCamera,
        resetCamera,
        syncSessionState
    };
})();
