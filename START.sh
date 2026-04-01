#!/bin/bash

echo "================================================"
echo "Trinorma Manager — Sistema de Gestión SGI DASSA"
echo "ISO 9001 | ISO 14001 | ISO 45001"
echo "================================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error al instalar dependencias"
        exit 1
    fi
else
    echo "✓ Dependencias ya instaladas"
fi

echo ""
echo "🏗️  Compilando frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error al compilar frontend"
    exit 1
fi

echo ""
echo "✓ Compilación completada"
echo ""
echo "🚀 Iniciando servidor..."
echo ""
echo "================================================"
echo "✅ Servidor iniciado"
echo "🌐 Accede a: http://localhost:3000"
echo ""
echo "📝 Cuentas de prueba:"
echo "   Admin:  santiago@dassa.com.ar / Admin123!"
echo "   Usuario: operaciones@dassa.com.ar / User123!"
echo "   Auditor: auditor@dassa.com.ar / Audit123!"
echo ""
echo "💾 Base de datos: trinorma.db"
echo "Presiona Ctrl+C para detener"
echo "================================================"
echo ""

npm start
