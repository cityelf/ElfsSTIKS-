/* S-T-I-K-S // 3D Visual Engine Module v1.1 (Stage 1: 60x60 Tactical City Map) */
window.STIKS3D = (function() {
    'use strict';

    const CELL_SIZE = 2.0;
    const HALF_WORLD = 30 * CELL_SIZE;

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
        geometries: {}
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
        ctxA.fillStyle = '#333c4a';
        ctxA.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1800; i++) {
            const v = 42 + ((i * 37) % 32);
            ctxA.fillStyle = `rgb(${v},${v + 5},${v + 12})`;
            ctxA.fillRect((i * 73) % 256, (i * 139) % 256, 2, 2);
        }
        ctxA.strokeStyle = 'rgba(203,213,225,0.28)';
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
            ground: new THREE.MeshBasicMaterial({ map: state.textures.asphalt, color: 0xcbd5e1 }),
            building: new THREE.MeshBasicMaterial({ map: state.textures.concrete, color: 0x94a3b8 }),
            rubble: new THREE.MeshBasicMaterial({ color: 0x64748b }),
            water: new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.88 }),
            cliff: new THREE.MeshBasicMaterial({ color: 0x1e293b }),
            fireBase: new THREE.MeshBasicMaterial({ color: 0xf97316 }),
            perimeter: new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
            fogEdge: new THREE.MeshBasicMaterial({ color: 0x05070b, transparent: true, opacity: 0.0, visible: false }),
            hover: new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.48, side: THREE.DoubleSide })
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
            state.scene.background = new THREE.Color(0x131924);

            const w = Math.max(300, hostEl.clientWidth || 560);
            const h = Math.max(280, hostEl.clientHeight || 380);

            state.camera = new THREE.PerspectiveCamera(45, w / h, 0.5, 220);
            state.camTarget = new THREE.Vector3(0, 0, 0);
            state.desiredCamTarget = new THREE.Vector3(0, 0, 0);

            state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            state.renderer.setSize(w, h);

            state.raycaster = new THREE.Raycaster();
            state.pointer = new THREE.Vector2();
            state.clock = new THREE.Clock();

            const ambLight = new THREE.AmbientLight(0xffffff, 1.15);
            state.scene.add(ambLight);
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x64748b, 0.95);
            state.scene.add(hemiLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
            dirLight.position.set(35, 65, 28);
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

            state.squadLight = new THREE.PointLight(0xfbbf24, 2.3, 24, 1.4);
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
                <button type="button" onclick="STIKS3D.rotateCamera(-0.4)" title="Повернуть камеру влево (Q)" style="background:rgba(15,23,42,0.85);border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">↺</button>
                <button type="button" onclick="STIKS3D.rotateCamera(0.4)" title="Повернуть камеру вправо (E)" style="background:rgba(15,23,42,0.85);border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">↻</button>
                <button type="button" onclick="STIKS3D.zoomCamera(-3.5)" title="Приблизить" style="background:rgba(15,23,42,0.85);border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">+</button>
                <button type="button" onclick="STIKS3D.zoomCamera(3.5)" title="Отдалить" style="background:rgba(15,23,42,0.85);border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">−</button>
                <button type="button" onclick="STIKS3D.resetCamera()" title="Центрировать на отряде" style="background:rgba(15,23,42,0.85);border:1px solid #10b981;color:#34d399;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;">🎯</button>
            `;
            state.hudEl = hud;
        }
        if (state.hudEl.parentNode !== hostEl) {
            hostEl.appendChild(state.hudEl);
        }
    }

    function rotateCamera(delta) { state.targetCamAngle += delta; }
    function zoomCamera(delta) { state.targetCamDist = Math.max(11, Math.min(48, state.targetCamDist + delta)); }

    function getLeaderPlayer() {
        const s = window.STIKS && STIKS.db ? STIKS.db.session : null;
        if (!s || !Array.isArray(s.players) || !s.players.length) return null;
        return s.players[Number(s.activeIdx) || 0] || s.players.find(pl => !pl.dead) || s.players[0];
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

    function onResize() {
        if (!state.initialized || !state.container || !state.renderer || !state.camera) return;
        const w = Math.max(280, state.container.clientWidth);
        const h = Math.max(260, state.container.clientHeight);
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(w, h);
    }

    window.addEventListener('resize', onResize);

    function clearGroup(grp) {
        if (!grp) return;
        while (grp.children.length > 0) grp.remove(grp.children);
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

                const fogMesh = new THREE.Mesh(state.geometries.fogPlane, state.materials.fogEdge);
                fogMesh.rotation.x = -Math.PI / 2;
                fogMesh.position.set(pos.x, 0.06, pos.z);
                state.fogGroup.add(fogMesh);
                state.fogTiles[`${x}_${y}`] = fogMesh;

                if (cell.blocked) {
                    const bType = cell.bType || 'Руины';
                    const r1 = hashCoord(x, y, 1);
                    const r2 = hashCoord(x, y, 2);

                    if (bType === 'Скала') {
                        const h = 2.8 + r1 * 3.6;
                        const w = CELL_SIZE * (0.84 + r2 * 0.12);
                        const d = CELL_SIZE * (0.84 + hashCoord(x, y, 3) * 0.12);
                        const bGeom = new THREE.BoxGeometry(w, h, d);
                        const bMesh = new THREE.Mesh(bGeom, state.materials.building);
                        bMesh.position.set(pos.x, h / 2, pos.z);

                        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bGeom), new THREE.LineBasicMaterial({ color: 0x0f172a }));
                        edges.position.copy(bMesh.position);

                        const cornice = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.16, d * 1.06), new THREE.MeshBasicMaterial({ color: 0x334155 }));
                        cornice.position.set(pos.x, h * 0.52, pos.z);

                        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.22, d * 1.05), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
                        roof.position.set(pos.x, h + 0.08, pos.z);

                        const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.24, d * 0.58), new THREE.MeshBasicMaterial({ color: 0x475569 }));
                        slab.position.set(pos.x + (r1 - 0.5) * 0.25, h + 0.24, pos.z);
                        slab.rotation.z = (r2 - 0.5) * 0.32;
                        state.staticGroup.add(bMesh, edges, cornice, roof, slab);
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
                            state.staticGroup.add(m);
                        }
                    } else if (bType === 'Водоем') {
                        const wMesh = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE * 0.98, 0.14, CELL_SIZE * 0.98), state.materials.water);
                        wMesh.position.set(pos.x, 0.05, pos.z);
                        wMesh.userData = { baseY: 0.05, phase: r1 * Math.PI * 2 };
                        state.staticGroup.add(wMesh);
                        state.waterMeshes.push(wMesh);
                    } else if (bType === 'Обрыв') {
                        const pit = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE * 0.94, 0.18, CELL_SIZE * 0.94), state.materials.cliff);
                        pit.position.set(pos.x, 0.02, pos.z);
                        state.staticGroup.add(pit);
                    } else if (bType === 'Пожар') {
                        const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.22, 8), state.materials.fireBase);
                        embers.position.set(pos.x, 0.11, pos.z);
                        state.staticGroup.add(embers);

                        const fireLight = new THREE.PointLight(0xf97316, 1.6, 8, 1.6);
                        fireLight.position.set(pos.x, 1.1, pos.z);
                        state.staticGroup.add(fireLight);

                        const pCount = 12;
                        const pPos = new Float32Array(pCount * 3);
                        for (let i = 0; i < pCount; i++) {
                            pPos[i * 3] = pos.x + (Math.random() - 0.5) * 0.6;
                            pPos[i * 3 + 1] = 0.2 + Math.random() * 1.8;
                            pPos[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.6;
                        }
                        const pGeom = new THREE.BufferGeometry();
                        pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
                        const pMat = new THREE.PointsMaterial({
                            color: 0xfb923c, size: 0.42, map: state.textures.particle,
                            transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
                        });
                        const pts = new THREE.Points(pGeom, pMat);
                        state.staticGroup.add(pts);
                        state.fireEmitters.push({ points: pts, light: fireLight, phase: r1 * 6.28 });
                    }
                }
            }
        }
        state.mapBuilt = true;
    }

    function getCellLootColor(cell) {
        if (!cell) return 0xfacc15;
        if (cell.isAzamatEaster || cell.isHellShortsSpot) return 0xf43f5e;
        if (cell.valuable) return 0xa855f7;
        const t = cell.lootType || '';
        if (t === 'weapon') return 0xef4444;
        if (t === 'armor') return 0x3b82f6;
        return 0x10b981;
    }

    function createCrateMesh(colorHex) {
        const grp = new THREE.Group();
        const matBox = new THREE.MeshBasicMaterial({ color: 0x334155 });
        const matTrim = new THREE.MeshBasicMaterial({ color: colorHex });
        const box = new THREE.Mesh(state.geometries.crateBox, matBox);
        box.position.y = 0.28;
        const lid = new THREE.Mesh(state.geometries.crateLid, matTrim);
        lid.position.y = 0.56;
        grp.add(box, lid);
        return grp;
    }

    const glbCache = {};

    function parseNativeGLB(arrayBuffer) {
        const dv = new DataView(arrayBuffer);
        if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('Not a GLB');
        const totalLen = dv.getUint32(8, true);
        let offset = 12, json = null, binStart = 0;
        while (offset < totalLen) {
            const chunkLen = dv.getUint32(offset, true);
            const chunkType = dv.getUint32(offset + 4, true);
            if (chunkType === 0x4E4F534A) {
                json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + 8, chunkLen)));
            } else if (chunkType === 0x004E4942) {
                binStart = offset + 8;
            }
            offset += 8 + chunkLen;
        }
        const getAcc = (idx) => {
            const acc = json.accessors[idx], bv = json.bufferViews[acc.bufferView];
            const off = binStart + (bv.byteOffset || 0) + (acc.byteOffset || 0);
            const nc = acc.type === 'SCALAR' ? 1 : (acc.type === 'VEC2' ? 2 : (acc.type === 'VEC3' ? 3 : (acc.type === 'VEC4' ? 4 : 16)));
            const cnt = acc.count * nc;
            if (acc.componentType === 5126) return new Float32Array(arrayBuffer, off, cnt);
            if (acc.componentType === 5123) return new Uint16Array(arrayBuffer, off, cnt);
            if (acc.componentType === 5125) return new Uint32Array(arrayBuffer, off, cnt);
            return new Uint8Array(arrayBuffer, off, cnt);
        };
        const texs = {};
        const texMats = [];
        (json.textures || []).forEach((td, i) => {
            const im = (json.images || [])[td.source];
            if (im && im.bufferView !== undefined) {
                const bv = json.bufferViews[im.bufferView];
                const blob = new Blob([new Uint8Array(arrayBuffer, binStart + (bv.byteOffset || 0), bv.byteLength)], { type: im.mimeType || 'image/png' });
                const imgEl = new Image();
                const tx = new THREE.Texture(imgEl);
                tx.flipY = false;
                tx.generateMipmaps = false;
                tx.minFilter = THREE.LinearFilter;
                tx.magFilter = THREE.LinearFilter;
                if (THREE.SRGBColorSpace) tx.colorSpace = THREE.SRGBColorSpace;
                imgEl.onload = () => {
                    const cvs = document.createElement('canvas');
                    cvs.width = imgEl.naturalWidth || imgEl.width || 64;
                    cvs.height = imgEl.naturalHeight || imgEl.height || 64;
                    cvs.getContext('2d').drawImage(imgEl, 0, 0, cvs.width, cvs.height);
                    const cTex = new THREE.CanvasTexture(cvs);
                    cTex.flipY = false;
                    if (THREE.SRGBColorSpace) cTex.colorSpace = THREE.SRGBColorSpace;
                    cTex.needsUpdate = true;
                    texMats.forEach(m => { m.map = cTex; m.needsUpdate = true; });
                };
                imgEl.src = URL.createObjectURL(blob);
                texs[i] = tx;
            }
        });
        const root = new THREE.Group();
        const buildNode = (ni, par) => {
            const nd = json.nodes[ni];
            if (!nd) return;
            const obj = new THREE.Group();
            if (nd.matrix) obj.applyMatrix4(new THREE.Matrix4().fromArray(nd.matrix));
            else {
                if (nd.translation) obj.position.fromArray(nd.translation);
                if (nd.rotation) obj.quaternion.fromArray(nd.rotation);
                if (nd.scale) obj.scale.fromArray(nd.scale);
            }
            if (nd.mesh !== undefined && json.meshes[nd.mesh]) {
                (json.meshes[nd.mesh].primitives || []).forEach((pr) => {
                    const g = new THREE.BufferGeometry();
                    if (pr.attributes.POSITION !== undefined) g.setAttribute('position', new THREE.BufferAttribute(getAcc(pr.attributes.POSITION), 3));
                    if (pr.attributes.NORMAL !== undefined) g.setAttribute('normal', new THREE.BufferAttribute(getAcc(pr.attributes.NORMAL), 3));
                    if (pr.attributes.TEXCOORD_0 !== undefined) g.setAttribute('uv', new THREE.BufferAttribute(getAcc(pr.attributes.TEXCOORD_0), 2));
                    let hasVCol = false;
                    if (pr.attributes.COLOR_0 !== undefined) {
                        const cArr = getAcc(pr.attributes.COLOR_0);
                        const accC = json.accessors[pr.attributes.COLOR_0];
                        const itemSize = accC.type === 'VEC4' ? 4 : 3;
                        g.setAttribute('color', new THREE.BufferAttribute(cArr, itemSize, accC.componentType !== 5126));
                        hasVCol = true;
                    }
                    if (pr.indices !== undefined) g.setIndex(new THREE.BufferAttribute(getAcc(pr.indices), 1));
                    if (!pr.attributes.NORMAL) g.computeVertexNormals();
                    let col = 0xffffff, map = null;
                    if (pr.material !== undefined && json.materials[pr.material]) {
                        const pbr = json.materials[pr.material].pbrMetallicRoughness || {};
                        if (Array.isArray(pbr.baseColorFactor)) col = new THREE.Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2]).getHex();
                        if (pbr.baseColorTexture && texs[pbr.baseColorTexture.index]) map = texs[pbr.baseColorTexture.index];
                    }
                    const mat = new THREE.MeshBasicMaterial({ color: col, map: map, vertexColors: hasVCol });
                    if (map) texMats.push(mat);
                    obj.add(new THREE.Mesh(g, mat));
                });
            }
            par.add(obj);
            (nd.children || []).forEach(ci => buildNode(ci, obj));
        };
        const sc = (json.scenes && json.scenes[json.scene || 0]) || { nodes: [] };
        (sc.nodes || []).forEach(ni => buildNode(ni, root));
        return root;
    }

    function attachGLBModel(parentGrp, fileName, targetHeight, yOffset) {
        const url = 'models/' + fileName;
        const applyClone = (origScene) => {
            const clone = origScene.clone(true);
            const box = new THREE.Box3().setFromObject(clone);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z, 0.001);
            const scale = (targetHeight || 1.35) / maxDim;
            clone.scale.set(scale, scale, scale);
            const box2 = new THREE.Box3().setFromObject(clone);
            const center = new THREE.Vector3();
            box2.getCenter(center);
            clone.position.x -= center.x;
            clone.position.z -= center.z;
            clone.position.y -= box2.min.y - (yOffset || 0.02);
            parentGrp.clear();
            parentGrp.add(clone);
        };
        if (glbCache[url] && glbCache[url].scene) { applyClone(glbCache[url].scene); return; }
        if (!glbCache[url]) glbCache[url] = { scene: null, queue: [], loading: false };
        glbCache[url].queue.push(applyClone);
        if (!glbCache[url].loading) {
            glbCache[url].loading = true;
            fetch(url).then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.arrayBuffer();
            }).then(buf => {
                const parsed = parseNativeGLB(buf);
                glbCache[url].scene = parsed;
                if (typeof window.log === 'function') window.log('✅ 3D-модель загружена: ' + fileName);
                glbCache[url].queue.splice(0).forEach(fn => fn(parsed));
            }).catch(e => {
                console.warn('[STIKS3D] GLB fallback:', url, e);
            });
        }
    }

    function createLootModel3D(cell) {
        const grp = new THREE.Group();
        const t = (cell && cell.lootType) || 'supply';
        const ringCol = cell && cell.valuable ? 0xc084fc : (t === 'weapon' ? 0xf87171 : (t === 'armor' ? 0x60a5fa : 0x4ade80));

        const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.54, 20), new THREE.MeshBasicMaterial({ color: ringCol, side: THREE.DoubleSide }));
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.y = 0.03;
        grp.add(baseRing);

        if (cell && cell.isAzamatEaster) {
            const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
            pan.position.y = 0.25;
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.45), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
            handle.position.set(0, 0.27, 0.52);
            const white = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 14), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
            white.position.y = 0.31;
            const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
            yolk.position.y = 0.34;
            grp.add(pan, handle, white, yolk);
            return grp;
        }

        if (cell && cell.valuable) {
            const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.36, 0.52), new THREE.MeshBasicMaterial({ color: 0x3b0764 }));
            chest.position.y = 0.2;
            const trim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.56), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
            trim.position.y = 0.38;
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), new THREE.MeshBasicMaterial({ color: 0xe879f9 }));
            crystal.position.y = 0.62;
            grp.add(chest, trim, crystal);
            return grp;
        }

        if (t === 'weapon' || t === 'armor') {
            const wHolder = new THREE.Group();
            grp.add(wHolder);
            attachGLBModel(wHolder, t === 'weapon' ? 'weapon-shooter.glb' : 'shield-rectangle.glb', 0.9, 0.08);
            return grp;
        }

        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.38), new THREE.MeshBasicMaterial({ color: 0x166534 }));
        pack.position.y = 0.36;
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.42), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        flap.position.y = 0.66;
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.14), new THREE.MeshBasicMaterial({ color: 0x15803d }));
        pocket.position.set(0, 0.3, 0.22);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        crossH.position.set(0, 0.32, 0.3);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        crossV.position.set(0, 0.32, 0.3);
        grp.add(pack, flap, pocket, crossH, crossV);

        const modelHolder = new THREE.Group();
        grp.add(modelHolder);
        attachGLBModel(modelHolder, 'item-luggage.glb', 0.85, 0.06);

        return grp;
    }

    function createSurvivorMesh(player, isActive) {
        const grp = new THREE.Group();
        const carObj = player && (player.towingCar || player.car);
        const isInf = Boolean(player && (player.asInfected || player.isInfected) && !player.isKvaz);
        const isKvaz = Boolean(player && player.isKvaz);

        if (carObj) {
            const carName = (carObj.name || '').toLowerCase();
            let bodyColor = 0x64748b, len = 1.55, wid = 0.9, hgt = 0.52;
            if (carName.includes('урал')) { bodyColor = 0x4d7c0f; len = 1.85; wid = 1.02; hgt = 0.72; }
            else if (carName.includes('tundra')) { bodyColor = 0xb91c1c; len = 1.7; wid = 0.96; hgt = 0.62; }
            const chassis = new THREE.Mesh(new THREE.BoxGeometry(wid, hgt, len), new THREE.MeshBasicMaterial({ color: bodyColor }));
            chassis.position.y = 0.38;
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.88, hgt * 0.62, len * 0.48), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
            cabin.position.set(0, 0.38 + hgt * 0.65, -len * 0.06);
            const wheelGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10);
            const wheelMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
            [[-wid * 0.5, 0.22, len * 0.32], [wid * 0.5, 0.22, len * 0.32], [-wid * 0.5, 0.22, -len * 0.32], [wid * 0.5, 0.22, -len * 0.32]].forEach(([wx, wy, wz]) => {
                const wh = new THREE.Mesh(wheelGeom, wheelMat);
                wh.rotation.z = Math.PI / 2;
                wh.position.set(wx, wy, wz);
                grp.add(wh);
            });
            grp.add(chassis, cabin);
        } else {
            const scale = isKvaz ? 1.25 : 1.0;
            const coatCol = isInf ? 0x991b1b : (isKvaz ? 0x6b21a8 : (isActive ? 0x15803d : 0x0369a1));
            const vestCol = isInf ? 0x450a0a : (isKvaz ? 0x3b0764 : 0x1e293b);
            const skinCol = isInf ? 0xa3e635 : (isKvaz ? 0xd8b4fe : 0xfde68a);

            const fig = new THREE.Group();
            fig.scale.set(scale, scale, scale);

            const legGeom = new THREE.BoxGeometry(0.16, 0.46, 0.18);
            const legMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
            const legL = new THREE.Mesh(legGeom, legMat); legL.position.set(-0.13, 0.25, 0);
            const legR = new THREE.Mesh(legGeom, legMat); legR.position.set(0.13, 0.25, 0);

            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.26), new THREE.MeshBasicMaterial({ color: coatCol }));
            torso.position.y = 0.72;
            const armor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.3), new THREE.MeshBasicMaterial({ color: vestCol }));
            armor.position.y = 0.76;

            const bag = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.2), new THREE.MeshBasicMaterial({ color: 0x3f3f46 }));
            bag.position.set(0, 0.75, -0.2);

            const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshBasicMaterial({ color: skinCol }));
            head.position.y = 1.15;
            const hood = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.32), new THREE.MeshBasicMaterial({ color: coatCol }));
            hood.position.y = 1.26;
            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: isInf ? 0xef4444 : 0x38bdf8 }));
            visor.position.set(0, 1.16, 0.15);

            const armGeom = new THREE.BoxGeometry(0.14, 0.44, 0.15);
            const armMat = new THREE.MeshBasicMaterial({ color: coatCol });
            const armL = new THREE.Mesh(armGeom, armMat); armL.position.set(-0.31, 0.72, 0.08); armL.rotation.x = -0.45;
            const armR = new THREE.Mesh(armGeom, armMat); armR.position.set(0.31, 0.72, 0.12); armR.rotation.x = -0.65;

            fig.add(legL, legR, torso, armor, bag, head, hood, visor, armL, armR);

            if (!isInf) {
                const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.72), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
                gun.position.set(0.26, 0.68, 0.36);
                fig.add(gun);
            } else {
                const clawL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 5), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
                clawL.rotation.x = Math.PI / 2; clawL.position.set(-0.31, 0.56, 0.34);
                const clawR = clawL.clone(); clawR.position.x = 0.31;
                fig.add(clawL, clawR);
            }

            if (player && (player.carryingCrown || player.hasPack)) {
                const crown = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
                crown.rotation.x = Math.PI / 2;
                crown.position.y = 1.42;
                fig.add(crown);
            }
            grp.add(fig);

            const isFem = Boolean(window.STIKS && typeof STIKS.isFem === 'function' && STIKS.isFem(player));
            let charGlb = isFem ? 'character-female-a.glb' : 'character-soldier.glb';
            if (isKvaz) charGlb = 'character-orc.glb';
            else if (isInf) charGlb = (player && player.isLegendary) ? 'character-vampire.glb' : 'character-zombie.glb';
            attachGLBModel(fig, charGlb, isKvaz ? 1.65 : 1.42, 0.02);
        }

        const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 24), new THREE.MeshBasicMaterial({ color: isActive ? 0x4ade80 : 0x38bdf8, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        grp.add(ring);
        return grp;
    }

    function createEnemyMesh(zombie) {
        const grp = new THREE.Group();
        const isHum = Boolean(zombie && zombie.isHuman);

        if (isHum) {
            const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.44, 0.16), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
            legL.position.set(-0.12, 0.24, 0);
            const legR = legL.clone(); legR.position.x = 0.12;
            const coat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.54, 0.26), new THREE.MeshBasicMaterial({ color: 0xd97706 }));
            coat.position.y = 0.72;
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), new THREE.MeshBasicMaterial({ color: 0xfde68a }));
            head.position.y = 1.14;
            grp.add(legL, legR, coat, head);
        } else {
            const bodyCol = zombie && zombie.type === 'ambush' ? 0xdc2626 : 0x65a30d;
            const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.18), new THREE.MeshBasicMaterial({ color: 0x365314 }));
            legL.position.set(-0.15, 0.22, -0.06);
            const legR = legL.clone(); legR.position.x = 0.15;
            const hunch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.34), new THREE.MeshBasicMaterial({ color: bodyCol }));
            hunch.position.set(0, 0.64, 0.06);
            hunch.rotation.x = 0.38;
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.3), new THREE.MeshBasicMaterial({ color: 0x4d7c0f }));
            head.position.set(0, 0.92, 0.26);
            const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
            eyes.position.set(0, 0.94, 0.41);
            const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), new THREE.MeshBasicMaterial({ color: bodyCol }));
            armL.position.set(-0.32, 0.54, 0.24); armL.rotation.x = -0.8;
            const armR = armL.clone(); armR.position.x = 0.32;
            grp.add(legL, legR, hunch, head, eyes, armL, armR);
        }

        const enemyHolder = new THREE.Group();
        grp.add(enemyHolder);
        let enemyGlb = isHum ? 'character-keeper.glb' : (zombie && zombie.type === 'ambush' ? 'character-skeleton.glb' : 'character-zombie.glb');
        attachGLBModel(enemyHolder, enemyGlb, 1.38, 0.02);

        const ring = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.58, 20), new THREE.MeshBasicMaterial({ color: isHum ? 0xfacc15 : 0xef4444, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        grp.add(ring);
        return grp;
    }

    function syncSessionState() {
        if (!state.initialized || !state.enabled) return;
        const s = window.STIKS && STIKS.db ? STIKS.db.session : null;
        if (!s || !Array.isArray(s.grid) || !s.grid.length) return;

        const seedSig = `${s.grid.length}_${s.diffKey || ''}_${s.grid[0] ? s.grid[0].bType || '' : ''}`;
        if (!state.mapBuilt || state.mapSeed !== seedSig) {
            state.mapSeed = seedSig;
            buildCity3D(s);
        }

        const leader = getLeaderPlayer();
        const lx = leader ? leader.x : 30;
        const ly = leader ? leader.y : 30;
        const viewRadius = 5;
        const size = s.grid.length;

        if (state.fogGroup) state.fogGroup.visible = false;

        const activeLootKeys = new Set();
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = s.grid[y][x];
                if (!cell || (!cell.lootType && !cell.isAzamatEaster && !cell.isHellShortsSpot)) continue;
                const dist = Math.max(Math.abs(x - lx), Math.abs(y - ly));
                if (dist > viewRadius + 2) continue;

                const key = `${x}_${y}`;
                activeLootKeys.add(key);
                if (!state.lootMeshes[key]) {
                    const crate = createLootModel3D(cell);
                    const pos = gridToWorld(x, y);
                    crate.position.set(pos.x, 0, pos.z);
                    crate.userData = { phase: (x + y) * 0.7 };
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

        const activeUnitKeys = new Set();
        const actIdx = Number(s.activeIdx) || 0;

        (s.players || []).forEach((p, idx) => {
            if (!p || p.dead || p.escaped) return;
            const key = `p_${p.uid || idx}`;
            activeUnitKeys.add(key);
            const isAct = idx === actIdx;
            const pos = gridToWorld(p.x, p.y);
            const sig = `${p.towingCar ? 1 : 0}_${p.car ? 1 : 0}_${p.asInfected}_${p.isKvaz}_${isAct}`;

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

            const escorts = Array.isArray(p.escortSquad) ? p.escortSquad : (p.escortNpc ? [p.escortNpc] : []);
            if (isAct && escorts.length) {
                escorts.forEach((comp, cIdx) => {
                    if (!comp || comp.hp <= 0) return;
                    const cKey = `esc_${idx}_${cIdx}`;
                    activeUnitKeys.add(cKey);
                    const angle = (cIdx / Math.max(1, escorts.length)) * Math.PI * 2;
                    const ox = Math.cos(angle) * 0.65;
                    const oz = Math.sin(angle) * 0.65;
                    let cMesh = state.unitMeshes[cKey];
                    if (!cMesh) {
                        cMesh = createSurvivorMesh({ asInfected: false }, false);
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
            if (!z || z.hidden) return;
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

        if (leader) {
            const lPos = gridToWorld(leader.x, leader.y);
            state.desiredCamTarget.set(lPos.x, 0, lPos.z);
            if (state.squadLight) state.squadLight.position.set(lPos.x, 4.8, lPos.z);
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

        const dx = g.x - leader.x;
        const dy = g.y - leader.y;

        if (dx === 0 && dy === 0) {
            if (typeof STIKS.searchCell === 'function') STIKS.searchCell(false);
        } else if (Math.abs(dx) >= Math.abs(dy)) {
            if (typeof STIKS.stepPlayer === 'function') STIKS.stepPlayer(Math.sign(dx), 0);
        } else {
            if (typeof STIKS.stepPlayer === 'function') STIKS.stepPlayer(0, Math.sign(dy));
        }
    }

    function startLoop() {
        if (state.rafId) return;
        const tick = () => {
            state.rafId = requestAnimationFrame(tick);
            if (!state.enabled || !state.initialized) return;

            const dt = Math.min(0.1, state.clock ? state.clock.getDelta() : 0.016);
            const t = state.clock ? state.clock.elapsedTime : 0;

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

            for (const key of Object.keys(state.unitMeshes)) {
                const m = state.unitMeshes[key];
                if (m && m.userData.targetPos) m.position.lerp(m.userData.targetPos, Math.min(1, dt * 12));
            }

            for (const key of Object.keys(state.lootMeshes)) {
                const c = state.lootMeshes[key];
                if (c) {
                    c.rotation.y = t * 1.4 + (c.userData.phase || 0);
                    c.position.y = Math.sin(t * 2.8 + (c.userData.phase || 0)) * 0.08 + 0.08;
                }
            }

            for (let i = 0; i < state.waterMeshes.length; i++) {
                const w = state.waterMeshes[i];
                w.position.y = w.userData.baseY + Math.sin(t * 2.2 + w.userData.phase) * 0.025;
            }

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
            btn.textContent = '🧊 3D: ВКЛ';
            btn.style.borderColor = '#10b981';
            btn.style.color = '#34d399';
        } else {
            btn.textContent = '🗺️ 3D: ВЫКЛ';
            btn.style.borderColor = '#6e2626';
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

        const vp = document.getElementById('game-viewport');
        if (!vp) return;

        const mapCanvas = vp.querySelector('canvas');
        const map2dBox = mapCanvas ? mapCanvas.parentNode : vp.querySelector('.v2-map-frame');
        if (!map2dBox || !map2dBox.parentNode) return;

        let host3d = document.getElementById('stiks-3d-viewport');

        if (!state.enabled) {
            if (host3d) host3d.style.display = 'none';
            map2dBox.style.display = '';
            return;
        }

        if (!host3d) {
            const hPx = window.innerWidth >= 960 ? '460px' : '350px';
            host3d = document.createElement('div');
            host3d.id = 'stiks-3d-viewport';
            host3d.style.cssText = `position:relative;width:100%;height:${hPx};min-height:320px;border-radius:8px;overflow:hidden;border:2px solid #7c2d2d;background:#070a10;`;
            map2dBox.parentNode.insertBefore(host3d, map2dBox);
        }

        host3d.style.display = 'block';
        map2dBox.style.display = 'none';

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

    hookEngine();
    setTimeout(function() {
        hookEngine();
        try { mountIntoGameView(); } catch (e) {}
    }, 150);
    setTimeout(function() {
        try { mountIntoGameView(); } catch (e) {}
    }, 600);

    return {
        toggleMode,
        rotateCamera,
        zoomCamera,
        resetCamera,
        syncSessionState
    };
})();
