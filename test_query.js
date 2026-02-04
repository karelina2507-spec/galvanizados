import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wcsnupcawrehmoldzfbm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjc251cGNhd3JlaG1vbGR6ZmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzU5MzcsImV4cCI6MjA4NTY1MTkzN30.lu_Qrh7thXsK6tv1Du9L8-oKAbFlh0IzMAROEUosjac'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      categoria:categorias(nombre)
    `)
    .limit(3)
  
  if (error) {
    console.log('ERROR:', error)
  } else {
    console.log('SUCCESS - Productos:', data.length)
    console.log(JSON.stringify(data, null, 2))
  }
}

testQuery()
