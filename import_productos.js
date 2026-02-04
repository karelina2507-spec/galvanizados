import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer variables de entorno
const envPath = join(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: No se encontraron las credenciales de Supabase en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Leer el archivo Excel
const workbook = XLSX.readFile('./src/data/productosapp.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Se encontraron ${data.length} productos en el Excel`);
console.log('Primeros 3 productos:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

// IDs fijos
const empresaId = '991d287a-dbef-4d6c-9ec0-5ec716c82f4a';
const categorias = {
  'Malla': '8d12d91c-100a-4be6-a172-b8a2c50905f6',
  'Alambre': 'df682390-1a8a-499b-be6b-ca418ee9fa8d',
  'Tejido': '9c65c327-8862-4dcc-b5d0-beb5a18b8e64'
};

// Mapear los datos del Excel a la estructura de la base de datos
const productos = data.map(row => {
  const categoria = (row.Categoria || '').trim();
  const categoriaId = categorias[categoria] || categorias['Malla'];

  return {
    empresa_id: empresaId,
    categoria_id: categoriaId,
    codigo_producto: row.Id_Producto || '',
    nombre: categoria,
    subtipo: row.SubTipo || '',
    descripcion: null,
    altura_m: parseFloat(row.Altura_m || 0) || null,
    largo_m: parseFloat(row.Largo_m || 0) || null,
    grosor_mm: parseFloat(row.Grosor_mm || 0) || null,
    separacion_cm: parseFloat(row.Separacion_cm || 0) || null,
    m2_rollo: parseFloat(row.M2_Rollo || 0) || null,
    precio_compra: parseFloat(row[' PrecioCosto_M2 '] || 0) || 0,
    precio_venta: parseFloat(row[' PrecioVenta_UYU '] || 0) || 0,
    precio_costo_m2: parseFloat(row[' PrecioCosto_M2 '] || 0) || null,
    precio_venta_m2: parseFloat(row.PrecioVenta_M2 || 0) || null,
    observacion: row.observacion || null,
    activo: true
  };
});

console.log('\nProductos procesados:');
console.log(JSON.stringify(productos.slice(0, 3), null, 2));

// Insertar en la base de datos usando SQL directo
console.log('\nInsertando productos en la base de datos...');

let insertCount = 0;
for (const producto of productos) {
  const { error } = await supabase.rpc('insertar_producto', {
    p_empresa_id: producto.empresa_id,
    p_categoria_id: producto.categoria_id,
    p_codigo_producto: producto.codigo_producto,
    p_nombre: producto.nombre,
    p_subtipo: producto.subtipo,
    p_altura_m: producto.altura_m,
    p_largo_m: producto.largo_m,
    p_grosor_mm: producto.grosor_mm,
    p_separacion_cm: producto.separacion_cm,
    p_m2_rollo: producto.m2_rollo,
    p_precio_compra: producto.precio_compra,
    p_precio_venta: producto.precio_venta,
    p_precio_costo_m2: producto.precio_costo_m2,
    p_precio_venta_m2: producto.precio_venta_m2,
    p_observacion: producto.observacion
  });

  if (error) {
    console.error(`Error al insertar producto ${producto.codigo_producto}:`, error);
  } else {
    insertCount++;
  }
}

console.log(`✓ Se insertaron ${insertCount} productos correctamente`);
