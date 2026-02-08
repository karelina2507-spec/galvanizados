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

    const { data: ventas } = await supabase
      .from('ventas')
      .select('id')
      .eq('empresa_id', empresa_id);

    if (ventas && ventas.length > 0) {
      const ventaIds = ventas.map(v => v.id);
      await supabase.from('detalle_ventas').delete().in('venta_id', ventaIds);
    }

    await supabase.from('ventas').delete().eq('empresa_id', empresa_id);

    const { data: presupuestos } = await supabase
      .from('presupuestos')
      .select('id')
      .eq('empresa_id', empresa_id);

    if (presupuestos && presupuestos.length > 0) {
      const presupuestoIds = presupuestos.map(p => p.id);
      await supabase.from('detalle_presupuestos').delete().in('presupuesto_id', presupuestoIds);
    }

    await supabase.from('presupuestos').delete().eq('empresa_id', empresa_id);

    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id')
      .eq('empresa_id', empresa_id);

    if (pedidos && pedidos.length > 0) {
      const pedidoIds = pedidos.map(p => p.id);
      await supabase.from('detalle_pedidos').delete().in('pedido_id', pedidoIds);
    }

    await supabase.from('pedidos').delete().eq('empresa_id', empresa_id);

    const { data: compras } = await supabase
      .from('compras')
      .select('id')
      .eq('empresa_id', empresa_id);

    if (compras && compras.length > 0) {
      const compraIds = compras.map(c => c.id);
      await supabase.from('detalle_compras').delete().in('compra_id', compraIds);
    }

    await supabase.from('compras').delete().eq('empresa_id', empresa_id);

    const { data: promociones } = await supabase
      .from('promociones')
      .select('id')
      .eq('empresa_id', empresa_id);

    if (promociones && promociones.length > 0) {
      const promocionIds = promociones.map(p => p.id);
      await supabase.from('detalle_promociones').delete().in('promocion_id', promocionIds);
    }

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
