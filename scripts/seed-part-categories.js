// Seed part categories to Railway API based on the user's list, idempotently.
// This script can be run multiple times; it will not duplicate records with the same name and parent.

const https = require('https');

const BASE_URL = 'https://web-production-fc58d.up.railway.app';
const API_PATH = '/api/part-categories';

function httpRequest(method, path, body) {
	const payload = body ? JSON.stringify(body) : null;
	const options = {
		method,
		hostname: new URL(BASE_URL).hostname,
		path,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Content-Length': payload ? Buffer.byteLength(payload) : 0,
		},
		timeout: 15000,
	};

	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				try {
					const json = data ? JSON.parse(data) : {};
					if (res.statusCode >= 200 && res.statusCode < 300) {
						resolve(json);
					} else {
						reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
					}
				} catch (e) {
					reject(new Error(`Invalid JSON response: ${e.message}; raw=${data}`));
				}
			});
		});
		req.on('error', reject);
		if (payload) req.write(payload);
		req.end();
	});
}

async function getAllCategories() {
	const res = await httpRequest('GET', API_PATH);
	return res.data || [];
}

async function createCategory(input) {
	const res = await httpRequest('POST', API_PATH, input);
	return res.id || (res.data && res.data.id);
}

async function ensureCategory(categories, { name, description = null, parentId = null, sort = 0, isActive = true }) {
	const existing = categories.find((c) => c.name === name && ((c.parent_id || null) === (parentId || null)));
	if (existing) return existing.id;
	const id = await createCategory({ name, description, parent_id: parentId, sort_order: sort, is_active: isActive });
	categories.push({ id, name, description, parent_id: parentId, sort_order: sort, is_active: isActive });
	return id;
}

async function run() {
	const categories = await getAllCategories();

	// Top-level groups
	const idKotlyGazowe = await ensureCategory(categories, { name: 'Kotły gazowe', sort: 1 });
	const idKotlyOlejowe = await ensureCategory(categories, { name: 'Kotły olejowe', sort: 2 });
	const idPalniki = await ensureCategory(categories, { name: 'Palniki gazowe/olejowe', sort: 3 });
	const idAutomatyka = await ensureCategory(categories, { name: 'Automatyka i sterowanie', sort: 4 });
	const idWyposazenie = await ensureCategory(categories, { name: 'Wyposażenie serwisanta', sort: 5 });

	// Kotły gazowe - children
	await ensureCategory(categories, { name: 'Elektrody zapłonowe i jonizacyjne', parentId: idKotlyGazowe, description: 'typowe zestawy: Viessmann (Vitodens 100/200), Junkers/Bosch (Condens 2300, 7000), Vaillant (ecoTEC)', sort: 10 });
	await ensureCategory(categories, { name: 'Uszczelki komory spalania', parentId: idKotlyGazowe, description: 'silikonowe i włókninowe, np. do Viessmann Vitodens 100-W, Junkers Cerapur, Vaillant ecoTEC', sort: 20 });
	await ensureCategory(categories, { name: 'Syfony kondensatu', parentId: idKotlyGazowe, description: 'proste, kolankowe, z kulką; pasujące do Bosch, Vaillant, De Dietrich', sort: 30 });
	await ensureCategory(categories, { name: 'Wężyki silikonowe 8/10 mm', parentId: idKotlyGazowe, description: null, sort: 40 });
	await ensureCategory(categories, { name: 'Wentylatory spalin', parentId: idKotlyGazowe, description: 'np. EBM-Papst – do Bosch, Junkers, Vaillant', sort: 50 });
	await ensureCategory(categories, { name: 'Presostaty powietrza/spalin', parentId: idKotlyGazowe, description: 'zakresy 40–150 Pa, 100–300 Pa', sort: 60 });
	await ensureCategory(categories, { name: 'Płyty główne sterownika', parentId: idKotlyGazowe, description: 'Junkers Heatronic 3, Viessmann Vitotronic 200, Vaillant ecoTEC mainboard', sort: 70 });
	await ensureCategory(categories, { name: 'Pompy obiegowe', parentId: idKotlyGazowe, description: 'Wilo Para 15/6, Grundfos UPM3 AUTO L', sort: 80 });
	await ensureCategory(categories, { name: 'Zawory bezpieczeństwa', parentId: idKotlyGazowe, description: '3 bary (najczęściej w kotłach gazowych)', sort: 90 });
	await ensureCategory(categories, { name: 'Odpowietrzniki automatyczne', parentId: idKotlyGazowe, description: '1/2”, 3/4” (np. Flamco, Afriso)', sort: 100 });
	await ensureCategory(categories, { name: 'Naczynia przeponowe', parentId: idKotlyGazowe, description: '6–12 litrów, ciśnienie wstępne 0,75–1 bar', sort: 110 });
	await ensureCategory(categories, { name: 'Czujniki temperatury (NTC)', parentId: idKotlyGazowe, description: 'typowe wartości: 10kΩ, 12kΩ', sort: 120 });
	await ensureCategory(categories, { name: 'Zawory trójdrożne i siłowniki', parentId: idKotlyGazowe, description: 'np. Honeywell VC6013, siłowniki Siemens SQS', sort: 130 });

	// Kotły olejowe - children
	await ensureCategory(categories, { name: 'Dysze olejowe', parentId: idKotlyOlejowe, description: 'Danfoss, Delavan, Steinen – zakres: 0,30–1,10 gal/h; kąty 45°, 60°, 80°; rozpylanie: H/S', sort: 10 });
	await ensureCategory(categories, { name: 'Filtry olejowe i wkłady', parentId: idKotlyOlejowe, description: 'wkłady siatkowe 50–100 mikronów; obudowy Danfoss 15/10, Afriso', sort: 20 });
	await ensureCategory(categories, { name: 'Uszczelki palników', parentId: idKotlyOlejowe, description: 'kompletne zestawy serwisowe do Riello, Bentone, Weishaupt', sort: 30 });
	await ensureCategory(categories, { name: 'Przewody olejowe elastyczne', parentId: idKotlyOlejowe, description: '1/4” i 3/8”, zbrojone, odporne na olej opałowy', sort: 40 });
	await ensureCategory(categories, { name: 'Elektrody zapłonowe (olejowe)', parentId: idKotlyOlejowe, description: 'typowe do Riello, Weishaupt, Bentone', sort: 50 });
	await ensureCategory(categories, { name: 'Fotokomórki (czujniki płomienia)', parentId: idKotlyOlejowe, description: 'Satronic/Siemens FZ711, QRB1, QRB3', sort: 60 });
	await ensureCategory(categories, { name: 'Pompy olejowe', parentId: idKotlyOlejowe, description: 'Danfoss BFP21/BFP41; Suntec AS47C/AL35C', sort: 70 });
	await ensureCategory(categories, { name: 'Silniki wentylatora', parentId: idKotlyOlejowe, description: '230 V, moc 80–150 W', sort: 80 });
	await ensureCategory(categories, { name: 'Transformatory/moduły zapłonowe', parentId: idKotlyOlejowe, description: 'Brahma TCD2, Satronic TZI 7, Danfoss EBI4', sort: 90 });
	await ensureCategory(categories, { name: 'Sterowniki palników', parentId: idKotlyOlejowe, description: 'Siemens LMO14/LMO24, Satronic TF 830/TF 832', sort: 100 });

	// Palniki gazowe/olejowe - children
	await ensureCategory(categories, { name: 'Komplety uszczelek serwisowych', parentId: idPalniki, description: 'Riello G3/G5, Weishaupt WL5, Bentone B2, Ecoflam Minor', sort: 10 });
	await ensureCategory(categories, { name: 'Zawory elektromagnetyczne gazowe/olejowe', parentId: idPalniki, description: 'Dungs MB-DLE 405, Honeywell V4600, Danfoss EV250', sort: 20 });
	await ensureCategory(categories, { name: 'Dysze gazowe', parentId: idPalniki, description: 'do LPG/gaz ziemny, średnice 0,8–2,0 mm', sort: 30 });
	await ensureCategory(categories, { name: 'Manometry i presostaty gazu/oleju', parentId: idPalniki, description: 'zakresy 0–50 mbar, 0–500 mbar, 0–3 bar', sort: 40 });
	await ensureCategory(categories, { name: 'Elektrody zapłonowe i czujniki płomienia', parentId: idPalniki, description: 'IR/UV przemysłowe', sort: 50 });
	await ensureCategory(categories, { name: 'Łożyska i wirniki wentylatorów', parentId: idPalniki, description: 'EBM-Papst, Ziehl-Abegg', sort: 60 });

	// Automatyka i sterowanie - children
	await ensureCategory(categories, { name: 'Moduły sterujące', parentId: idAutomatyka, description: 'Honeywell S4565, Siemens LME11, Elster Kromschröder BCU', sort: 10 });
	await ensureCategory(categories, { name: 'Regulatory temperatury kotła/pomieszczenia', parentId: idAutomatyka, description: 'Vaillant calorMATIC, Viessmann Vitotrol, Siemens REV24', sort: 20 });
	await ensureCategory(categories, { name: 'Termostaty bezpieczeństwa STB', parentId: idAutomatyka, description: '100–120 °C, reset ręczny/automatyczny', sort: 30 });
	await ensureCategory(categories, { name: 'Czujniki temperatury', parentId: idAutomatyka, description: 'NTC 10kΩ, PT1000 – rurkowe i kontaktowe', sort: 40 });
	await ensureCategory(categories, { name: 'Przekaźniki czasowe', parentId: idAutomatyka, description: 'Finder, Relpol (0–600 s)', sort: 50 });

	// Wyposażenie serwisanta - children
	await ensureCategory(categories, { name: 'Zestaw uszczelek uniwersalnych', parentId: idWyposazenie, description: 'silikonowe, włókninowe, FKM', sort: 10 });
	await ensureCategory(categories, { name: 'Analizator spalin', parentId: idWyposazenie, description: 'Testo 320/330, Kimo', sort: 20 });
	await ensureCategory(categories, { name: 'Manometry', parentId: idWyposazenie, description: '0–50 mbar, 0–500 mbar, 0–3 bar', sort: 30 });
	await ensureCategory(categories, { name: 'Zestaw kluczy', parentId: idWyposazenie, description: 'torx, imbusy, nasadki 1/4” i 1/2”', sort: 40 });
	await ensureCategory(categories, { name: 'Chemia serwisowa', parentId: idWyposazenie, description: 'Fernox DS40; spray do wymienników; smar Molykote 111', sort: 50 });

	const finalList = await getAllCategories();
	console.log(JSON.stringify({ success: true, count: finalList.length }, null, 2));
}

run().catch((e) => {
	console.error('Seed failed:', e.message);
	process.exitCode = 1;
}); 