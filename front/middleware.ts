import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- 1. LÓGICA DE PROXY (Frontend -> Backend Koyeb) ---
  if (path.startsWith("/api/")) {
    // Quitamos '/api' del path. Ej: /api/auth/login -> /auth/login
    const backendPath = path.replace(/^\/api/, "");
    
    // Obtenemos la URL del backend desde variables de entorno
    // IMPORTANTE: Asegúrate de que BACKEND_URL esté definida en Vercel
    const backendUrl = process.env.BACKEND_URL || "https://medical-octopus-lauramussa-f33629ba.koyeb.app";
    
    // Construimos la URL completa destino
    const targetUrl = `${backendUrl}${backendPath}${request.nextUrl.search}`;

    console.log(`🔀 PROXY REQUEST: ${path} -> ${targetUrl}`);

    try {
      // Reenviamos la petición al backend real
      const backendResponse = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers, // Pasamos headers originales (Cookies, Content-Type, etc)
        body: request.body,       // Pasamos el cuerpo de la petición (JSON)
        // 'duplex' es necesario para streams en algunos entornos de Node/Edge, 
        // pero fetch standard a veces se queja. Si da error, lo quitamos.
        // @ts-ignore
        duplex: 'half', 
      });

      console.log(`✅ PROXY RESPONSE: ${backendResponse.status}`);

      // Devolvemos la respuesta del backend al navegador
      return backendResponse;
    } catch (error) {
      console.error("❌ PROXY ERROR:", error);
      return NextResponse.json({ error: "Backend Connection Failed" }, { status: 502 });
    }
  }

  // --- 2. LÓGICA DE AUTENTICACIÓN (Tu código original) ---

  const token = request.cookies.get("access_token")?.value;
  const authRoutes = ["/login", "/register"];

  if (authRoutes.includes(path)) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // (Tu lógica comentada de rutas protegidas la dejo igual, comentada)
  // const protectedPrefixes = ["/analytics", "/categories", "/customers", "/products", "/sales"];
  // ...

  return NextResponse.next();
}

export const config = {
  // ⚠️ CAMBIO CRUCIAL AQUÍ: Quitamos 'api|' del regex para que el middleware intercepte /api
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|.*\\.svg).*)"],
};
