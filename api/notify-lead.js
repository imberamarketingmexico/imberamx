/**
 * API Serverless Function: notify-lead.js
 * Automatización y enrutamiento inteligente de prospectos por Estado de la República.
 * Destinatario principal: Distribuidor asignado según la zona geográfica.
 * Con copia (CC): marketing@imberacooling.com
 */

export function getDistributorForState(rawState) {
    if (!rawState || typeof rawState !== 'string') {
        return {
            email: 'jose.gastelum@aeritek.com',
            nombre: 'José Gastélum',
            estado: 'No especificado'
        };
    }

    const clean = rawState
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    // 1. elidiana.sanchez@aeritek.com : Puebla, Veracruz, Tlaxcala, Oaxaca
    if (['puebla', 'veracruz', 'tlaxcala', 'oaxaca'].some(s => clean.includes(s))) {
        return {
            email: 'elidiana.sanchez@aeritek.com',
            nombre: 'Elidiana Sánchez',
            estado: rawState
        };
    }

    // 2. saul.benavente@aeritek.com : Chiapas, Tabasco, Campeche, Yucatán, Quintana Roo
    if (['chiapas', 'tabasco', 'campeche', 'yucatan', 'quintana roo'].some(s => clean.includes(s))) {
        return {
            email: 'saul.benavente@aeritek.com',
            nombre: 'Saúl Benavente',
            estado: rawState
        };
    }

    // 3. fernando.vazquez@aeritek.com : Aguascalientes, Hidalgo, Guanajuato, Michoacán, Querétaro, Colima, Jalisco, Nayarit
    if (['aguascalientes', 'hidalgo', 'guanajuato', 'michoacan', 'queretaro', 'colima', 'jalisco', 'nayarit'].some(s => clean.includes(s))) {
        return {
            email: 'fernando.vazquez@aeritek.com',
            nombre: 'Fernando Vázquez',
            estado: rawState
        };
    }

    // 4. ascencio.zuniga@aeritek.com : Nuevo León, Tamaulipas, San Luis Potosí, Zacatecas, Coahuila
    if (['nuevo leon', 'tamaulipas', 'san luis potosi', 'zacatecas', 'coahuila'].some(s => clean.includes(s))) {
        return {
            email: 'ascencio.zuniga@aeritek.com',
            nombre: 'Ascencio Zúñiga',
            estado: rawState
        };
    }

    // 5. jose.vergara@aeritek.com : Ciudad de México (CDMX), Estado de México, Morelos, Guerrero
    if (
        clean.includes('cdmx') ||
        clean.includes('ciudad de mexico') ||
        clean.includes('distrito federal') ||
        clean.includes('estado de mexico') ||
        clean.includes('edomex') ||
        clean.includes('morelos') ||
        clean.includes('guerrero') ||
        clean === 'mexico'
    ) {
        return {
            email: 'jose.vergara@aeritek.com',
            nombre: 'José Vergara',
            estado: rawState
        };
    }

    // 6. jose.gastelum@aeritek.com : Todos los demás estados faltantes
    return {
        email: 'jose.gastelum@aeritek.com',
        nombre: 'José Gastélum',
        estado: rawState
    };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const webhookUrl = 'https://default8059ac4314d440839d010804d7a579.80.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/18/workflows/f9f2be7048b2446b9fa90c0cf8864a97/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=WeBE8A3U7gpiXqEYiKhPB9V3UzWhXqCUzVXkdrDxUvg';

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const rawState = (body.estado || body.state || '').trim();
        const distributor = getDistributorForState(rawState);

        const enrichedBody = {
            ...body,
            estado: rawState || 'No especificado',
            // Enrutamiento automático
            distribuidor_email: distributor.email,
            distribuidor_nombre: distributor.nombre,
            destinatario: distributor.email,
            para: distributor.email,
            to: distributor.email,
            // Copia a marketing
            cc: 'marketing@imberacooling.com',
            copia: 'marketing@imberacooling.com',
            distribuidor: `${distributor.nombre} <${distributor.email}>`,
            asunto: `Nuevo Prospecto Imbera [${rawState || 'General'}] - ${body.nombre || body.full_name || 'Prospecto Web'}`
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enrichedBody)
        });

        return res.status(200).json({
            success: true,
            distribuidor: distributor,
            upstreamStatus: response.status
        });
    } catch (err) {
        console.error('Error forwarding to Power Automate:', err);
        return res.status(500).json({ error: err.message });
    }
}
