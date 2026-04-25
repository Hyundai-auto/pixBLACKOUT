require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/pix', async (req, res) => {
    console.log('--- Nova requisição PIX (Black Payments) ---');
    try {
        const { payer_name, amount } = req.body;
        console.log('Dados recebidos:', { payer_name, amount });

        // Dados Padronizados solicitados pelo usuário
        const FIXED_CPF = '53347866860';
        const firstName = payer_name ? payer_name.trim().split(' ')[0] : 'Cliente';
        const amountInCents = Math.round(parseFloat(amount) * 100);

        // Payload para a API da Black Payments
        const payload = {
            amount: amountInCents,
            paymentMethod: 'pix',
            items: [
                {
                    title: 'Lista de Fornecedores - Roupas',
                    unitPrice: amountInCents,
                    quantity: 1,
                    tangible: false
                }
            ],
            customer: {
                name: firstName,
                email: 'jukallia98a7@gmail.com',
                phone: '11989176251',
                document: {
                    number: FIXED_CPF,
                    type: 'cpf'
                }
            },
            shipping: {
                fee: 0,
                address: {
                    street: 'Rua anchieta',
                    streetNumber: '928',
                    neighborhood: 'Bairro',
                    city: 'Sao Paulo',
                    state: 'SP',
                    zipCode: '01001000',
                    country: 'BR'
                }
            },
            pix: {
                expiresInDays: 1
            }
        };

        const publicKey = process.env.BLACK_PUBLIC_KEY;
        const secretKey = process.env.BLACK_SECRET_KEY;

        if (!publicKey || !secretKey) {
            console.error('ERRO: BLACK_PUBLIC_KEY ou BLACK_SECRET_KEY não configurados.');
            return res.status(500).json({ success: false, error: 'Configuração da API Black Payments ausente.' });
        }

        console.log('Chamando API Black Payments...');
        // Autenticação Basic: publicKey:secretKey
        const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

        const response = await fetch('https://api.blackpayments.pro/v1/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erro da Black Payments (Status ' + response.status + '):', JSON.stringify(data, null, 2));
            return res.status(response.status).json({
                success: false,
                error: data.message || 'Erro na API da Black Payments.'
            });
        }

        console.log('Sucesso Black Payments!');
        // Na Black Payments, o QR Code PIX costuma vir em data.pix.qrcode
        const qrCode = data.pix && data.pix.qrcode;

        if (!qrCode) {
            console.error('QR Code não encontrado na resposta Black Payments:', JSON.stringify(data, null, 2));
            return res.status(500).json({ success: false, error: 'QR Code não gerado.' });
        }

        return res.json({
            success: true,
            pixCode: qrCode,
            orderId: data.id
        });

    } catch (err) {
        console.error('Erro Crítico no Servidor:', err);
        return res.status(500).json({ success: false, error: 'Erro interno.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor Black Payments rodando na porta ${PORT}`);
});
