# Perfilab

Plataforma pra analisar perfis do Instagram com dados oficiais da Meta e IA.

Você cola o @ e recebe: números, formatos, nicho, posicionamento, temas, hooks, narrativas, a nota de **furar a bolha** e uma apresentação pronta.

## O que tem

| Tela | O que faz |
|---|---|
| **Analisar** | Cola o @ ou o link do perfil. Gera o dashboard com 5 abas e a apresentação em slides (baixa em PDF). |
| **Radar** | Os 20 conteúdos que mais furaram a bolha em cada categoria, nos últimos 30 dias. Dá pra pesquisar e criar categorias. |
| **Opt-in** | Gera um link pra pessoa autorizar a análise completa (alcance, envios, salvamentos, tempo assistido, público). |
| **Algoritmo** | As regras do algoritmo que a plataforma usa, todas com a fonte oficial da Meta. |

## Testar agora (sem configurar nada)

```bash
npm install
cp .env.example .env
npm run dev
```

Abre http://localhost:3000 e testa:

- `@demo`: perfil de demonstração com dados públicos
- `@demo.completo`: o mesmo perfil com os dados internos do opt-in
- **Radar**: mostra dados de demonstração até a Meta ser conectada

Sem a chave da Anthropic, a parte qualitativa usa uma análise básica automática. Com a chave, entra a leitura completa com IA.

## Login

A plataforma toda pede login, menos as páginas que a criadora vê no opt-in (`/conectar/aceite` e `/conectar/obrigado`) e as páginas de privacidade e exclusão de dados.

- **Administradora:** crie `ADMIN_EMAIL` e `ADMIN_PASSWORD` na Vercel. A senha nunca fica no código.
- **Equipe:** a administradora adiciona e remove pessoas na página **Equipe** (ícone de pessoas no topo). As senhas são guardadas criptografadas (scrypt) no Redis.
- A sessão dura 30 dias. Depois de 6 senhas erradas, o e-mail fica bloqueado por 15 minutos.

## Ligar os dados reais

### 1. Análise pública (colar o @)

Usa o recurso **Business Discovery** da API oficial. Funciona com perfis comerciais ou de criador.

1. Deixa o seu Instagram como conta profissional e liga ele a uma Página do Facebook.
2. Em [developers.facebook.com](https://developers.facebook.com), cria um app do tipo **Empresa** e adiciona o produto **Instagram** (API com login do Facebook).
3. No **Explorador da API do Graph**, gera um token com `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `business_management` e `ads_read`. Depois estende o token no **Depurador de token de acesso** (dura 60 dias).
4. Descobre o ID da sua conta do Instagram: `GET /me/accounts?fields=instagram_business_account`.
5. Preenche no `.env`: `IG_USER_ID` e `IG_ACCESS_TOKEN`.

### 2. Radar de trends

Usa duas fontes oficiais:

- **Perfis de referência** (Business Discovery): é daqui que sai a medida real de quem furou a bolha, comparando as views dos Reels com o número de seguidores. Adiciona os perfis em **Radar > Fontes**.
- **Hashtags** (Hashtag Search): traz os posts mais populares de cada hashtag. Precisa do recurso **Instagram Public Content Access** aprovado na revisão do app. A Meta limita a 30 hashtags diferentes por semana e não informa o autor desses posts.

### 3. Opt-in (análise completa)

Usa o **login unificado** da Meta, com permissão só de leitura. Apps novos não têm mais o "login do Instagram" separado. O token gerado não vence.

1. No app, vai em **Instagram > API setup with Unified login** e conecta um **portfólio empresarial**.
2. Cria uma configuração só com `instagram_basic` e `instagram_manage_insights`. Tira as permissões de mensagens, comentários, publicação e anúncios.
3. Em **Redirect URL** da configuração, coloca `{APP_URL}/api/auth/instagram/callback`.
4. Na Vercel, preenche `META_APP_ID`, `META_APP_SECRET` (em **Configurações do app > Básico**), `META_LOGIN_CONFIG_ID` (o ID da configuração) e `APP_URL`.
5. Enquanto o app tá em modo de desenvolvimento, só funciona com pessoas que têm função no app. Pra mandar o link pra qualquer pessoa, o app precisa passar na revisão da Meta (acesso avançado) e ir pro modo **Ao vivo**. A Meta também pede política de privacidade e uma URL de exclusão de dados.

### 4. Análise com IA

Coloca a chave da Anthropic em `ANTHROPIC_API_KEY`. A IA lê legendas, números e as capas dos posts com mais engajamento.

## Como a nota de furar a bolha funciona

Cada post ganha uma nota de 0 a 100 juntando 5 sinais. Os pesos seguem o que a Meta já falou publicamente (detalhes e fontes na tela **Algoritmo**).

| Sinal | Peso | Análise pública | Com opt-in |
|---|---|---|---|
| Chegou em gente de fora | 35 | views ÷ seguidores | alcance real ÷ seguidores |
| Desempenho vs. média do perfil | 20 | engajamento | engajamento |
| Envios por DM | 20 | estimado pela IA | envios ÷ alcance (real) |
| Segura a atenção | 15 | força do hook (IA) | tempo médio assistido (real) |
| Formato | 10 | Reels pesam mais | Reels pesam mais |

Post com risco nas Diretrizes de Recomendação (isca de engajamento, repost) perde 10 pontos.

## Antes de colocar no ar

- Hoje as análises, os tokens do opt-in e as capas ficam na pasta `.data`. Pra hospedar na Vercel, isso precisa ir pra um banco (Supabase, por exemplo), porque lá o disco não é permanente. Os tokens devem ser guardados com criptografia.
- Não tem login na plataforma ainda. Qualquer pessoa com o link consegue usar.

## Estrutura

```
app/                 telas e rotas da API
components/          dashboard, grade de posts, gráficos, modais
lib/instagram.ts     API pública da Meta (Business Discovery e hashtags)
lib/optin.ts         login do Instagram e dados internos
lib/metrics.ts       análise quantitativa
lib/ai.ts            análise qualitativa (Claude) e versão básica
lib/algorithm.ts     base do algoritmo com fontes e a nota de furar a bolha
lib/trends.ts        radar de trends
lib/media.ts         cache das capas (os links da Meta expiram)
```
