import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { empresa_id } = await req.json();

    if (!empresa_id) {
      return new Response(
        JSON.stringify({ error: 'empresa_id es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    await supabase.from('detalle_ventas').delete().in('venta_id',
      supabase.from('ventas').select('id').eq('empresa_id', empresa_id)
    );

    await supabase.from('ventas').delete().eq('empresa_id', empresa_id);

    await supabase.from('detalle_presupuestos').delete().in('presupuesto_id',
      supabase.from('presupuestos').select('id').eq('empresa_id', empresa_id)
    );

    await supabase.from('presupuestos').delete().eq('empresa_id', empresa_id);

    await supabase.from('detalle_pedidos').delete().in('pedido_id',
      supabase.from('pedidos').select('id').eq('empresa_id', empresa_id)
    );

    await supabase.from('pedidos').delete().eq('empresa_id', empresa_id);

    await supabase.from('detalle_compras').delete().in('compra_id',
      supabase.from('compras').select('id').eq('empresa_id', empresa_id)
    );

    await supabase.from('compras').delete().eq('empresa_id', empresa_id);

    await supabase.from('detalle_promociones').delete().in('promocion_id',
      supabase.from('promociones').select('id').eq('empresa_id', empresa_id)
    );

    await supabase.from('promociones').delete().eq('empresa_id', empresa_id);

    await supabase.from('historial_stock').delete().eq('empresa_id', empresa_id);

    await supabase.from('gastos').delete().eq('empresa_id', empresa_id);

    await supabase.from('clientes').delete().eq('empresa_id', empresa_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Todos los datos de prueba han sido eliminados correctamente'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error al resetear datos:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al eliminar los datos',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
