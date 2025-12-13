import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- 1. LÓGICA DE PROXY (Frontend -> Backend Koyeb) ---
  // Esta parte funciona perfecto, no la tocamos.
  if (path.startsWith("/api/")) {
    const backendPath = path.replace(/^\/api/, "");
    const backendUrl = process.env.BACKEND_URL || "https://medical-octopus-lauramussa-f33629ba.koyeb.app";
    const targetUrl = `${backendUrl}${backendPath}${request.nextUrl.search}`;

    // console.log(`🔀 PROXY: ${path} -> ${targetUrl}`); // Comentar logs en producción para limpiar consola

    try {
      const backendResponse = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        // @ts-ignore
        duplex: 'half', 
      });
      return backendResponse;
    } catch (error) {
      console.error("❌ PROXY ERROR:", error);
      return NextResponse.json({ error: "Backend Connection Failed" }, { status: 502 });
    }
  }

  // --- 2. LÓGICA DE AUTENTICACIÓN ---

  const token = request.cookies.get("access_token")?.value;

  // A. Redirigir si ya está logueado e intenta ir a login/register
  const authRoutes = ["/login", "/register"];
  if (authRoutes.includes(path)) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // B. Rutas Protegidas (Dashboard y secciones internas)
  // Define qué prefijos quieres proteger.
  const protectedPrefixes = [
    "/analytics", 
    "/categories", 
    "/customers", 
    "/products", 
    "/sales"
  ];

  // Verificamos si la ruta actual es "/" O empieza con alguno de los prefijos
  const isProtectedRoute = path === "/" || protectedPrefixes.some((prefix) => path.startsWith(prefix));

  if (isProtectedRoute) {
    if (!token) {
      // Si no tiene token, lo mandamos al login
      const url = new URL("/login", request.url);
      // Tip: Puedes agregar ?callbackUrl=... para redirigirlo de vuelta después
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Mantenemos el matcher que incluye todo (menos estáticos) para atrapar /api y /
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|.*\\.svg).*)"],
};
