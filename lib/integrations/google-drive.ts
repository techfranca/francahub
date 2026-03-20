import { google } from 'googleapis'

const SHARED_DRIVE_ID = '0ABUaieLcZITFUk9PVA'
const BASE_FOLDER_ID = '1OwZwe5mZ4YTBuq0JA88S4zN5PoKp2OVe'

const SERVICOS_PASTAS: Record<string, string> = {
  'tráfego pago': 'Tráfego pago',
  'trafego pago': 'Tráfego pago',
  'produção de conteúdo': 'Produção de conteúdo',
  'producao de conteudo': 'Produção de conteúdo',
  'conteúdo': 'Produção de conteúdo',
  'conteudo': 'Produção de conteúdo',
  'ia': 'IA',
  'inteligência artificial': 'IA',
  'inteligencia artificial': 'IA',
}

function getDrive() {
  const rawCreds = process.env.GOOGLE_CREDENTIALS_JSON
  if (!rawCreds) {
    throw new Error('GOOGLE_CREDENTIALS_JSON não está definida nas variáveis de ambiente')
  }

  let credentials: Record<string, string>
  try {
    credentials = JSON.parse(rawCreds)
  } catch (e) {
    throw new Error('Erro ao parsear GOOGLE_CREDENTIALS_JSON: ' + (e as Error).message)
  }

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  return google.drive({ version: 'v3', auth })
}

function getAnoAtual() {
  return new Date().getFullYear()
}

async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
): Promise<string> {
  const safeName = name.replace(/'/g, "\\'")

  const res = await drive.files.list({
    corpora: 'drive',
    driveId: SHARED_DRIVE_ID,
    q: `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  if (res.data.files?.length) {
    return res.data.files[0].id!
  }

  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  return created.data.id!
}

async function checkClientFolderExists(
  drive: ReturnType<typeof google.drive>,
  clientName: string,
  segmentoFolderId: string
) {
  const safeName = clientName.replace(/'/g, "\\'")

  const res = await drive.files.list({
    corpora: 'drive',
    driveId: SHARED_DRIVE_ID,
    q: `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and '${segmentoFolderId}' in parents and trashed=false`,
    fields: 'files(id, name, webViewLink)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  if (res.data.files?.length) {
    return {
      exists: true,
      folderId: res.data.files[0].id!,
      folderLink: res.data.files[0].webViewLink!,
    }
  }

  return { exists: false, folderId: null, folderLink: null }
}

function parseServicosContratados(servicosTexto: string | null): string[] {
  if (!servicosTexto) return []

  const texto = servicosTexto.toLowerCase()
  const pastas: string[] = []

  for (const [keyword, pastaNome] of Object.entries(SERVICOS_PASTAS)) {
    if (texto.includes(keyword) && !pastas.includes(pastaNome)) {
      pastas.push(pastaNome)
    }
  }

  return pastas
}

export interface CreateFolderResult {
  success: boolean
  message: string
  alreadyExisted?: boolean
  folderId?: string | null
  folderLink?: string | null
  servicosCriados?: string[]
  error?: string
}

export async function createClientFolderStructure({
  nomeCliente,
  segmento,
  servicosContratados,
}: {
  nomeCliente: string
  segmento: string
  servicosContratados: string | null
}): Promise<CreateFolderResult> {
  try {
    const drive = getDrive()
    const ano = getAnoAtual().toString()

    const marketingId = await findOrCreateFolder(drive, 'Marketing', BASE_FOLDER_ID)
    const clientesId = await findOrCreateFolder(drive, 'Clientes', marketingId)
    const segmentoId = await findOrCreateFolder(drive, segmento, clientesId)

    const clienteCheck = await checkClientFolderExists(drive, nomeCliente, segmentoId)
    if (clienteCheck.exists) {
      return {
        success: true,
        message: 'Pasta do cliente já existia',
        alreadyExisted: true,
        folderId: clienteCheck.folderId,
        folderLink: clienteCheck.folderLink,
      }
    }

    const clienteId = await findOrCreateFolder(drive, nomeCliente, segmentoId)

    await findOrCreateFolder(drive, '[F] Informações', clienteId)
    await findOrCreateFolder(drive, '[F] Estratégia', clienteId)

    const designId = await findOrCreateFolder(drive, 'Design / Criativos', clienteId)

    const subpastasDesign = ['Materiais', 'Conteúdo', 'Anúncios', 'Outros']
    for (const subpasta of subpastasDesign) {
      const subpastaId = await findOrCreateFolder(drive, subpasta, designId)
      await findOrCreateFolder(drive, ano, subpastaId)
    }

    const servicosPastas = parseServicosContratados(servicosContratados)
    for (const servico of servicosPastas) {
      await findOrCreateFolder(drive, servico, clienteId)
    }

    const folderInfo = await drive.files.get({
      fileId: clienteId,
      fields: 'webViewLink',
      supportsAllDrives: true,
    })

    return {
      success: true,
      message: 'Estrutura de pastas criada com sucesso!',
      alreadyExisted: false,
      folderId: clienteId,
      folderLink: folderInfo.data.webViewLink,
      servicosCriados: servicosPastas,
    }
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || 'Erro ao criar estrutura de pastas',
      error: String(error),
    }
  }
}

export async function testDriveConnection() {
  try {
    const drive = getDrive()
    const res = await drive.files.get({
      fileId: BASE_FOLDER_ID,
      fields: 'id, name',
      supportsAllDrives: true,
    })

    return { success: true, message: 'Conexão com Google Drive OK', folderName: res.data.name }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}
