// DIAGNÓSTICO: Extensão Sales Copilot - Botão não clicável
// Cole este script no Console do Chrome (F12) na página do Google Meet

console.log('=== DIAGNÓSTICO SALES COPILOT ===');

// 1. Verificar se o host element existe
const host = document.getElementById('sales-copilot-root');
if (!host) {
    console.error('❌ PROBLEMA: Host element não encontrado!');
    console.log('→ A extensão não foi injetada. Verifique:');
    console.log('  1. A extensão está instalada e ativa?');
    console.log('  2. Você está em meet.google.com?');
    console.log('  3. Recarregue a página (F5)');
} else {
    console.log('✅ Host element encontrado');
    console.log('   Width:', host.style.width);
    console.log('   Height:', host.style.height);
    console.log('   Left:', host.style.left);
    console.log('   Top:', host.style.top);
    console.log('   Z-index:', host.style.zIndex);

    // 2. Verificar Shadow DOM
    if (!host.shadowRoot) {
        console.error('❌ PROBLEMA: Shadow DOM não encontrado!');
    } else {
        console.log('✅ Shadow DOM encontrado');

        // 3. Verificar se o botão existe
        const button = host.shadowRoot.querySelector('button');
        if (!button) {
            console.warn('⚠️ Nenhum botão encontrado no Shadow DOM');
            console.log('→ Possíveis causas:');
            console.log('  1. Você não fez login na extensão');
            console.log('  2. O sidebar está minimizado');
            console.log('  3. Erro no build da extensão');
        } else {
            console.log('✅ Botões encontrados:', host.shadowRoot.querySelectorAll('button').length);

            // 4. Procurar especificamente o botão de gravação
            const buttons = Array.from(host.shadowRoot.querySelectorAll('button'));
            const recordButton = buttons.find(b =>
                b.textContent?.includes('Iniciar') ||
                b.textContent?.includes('Parar') ||
                b.textContent?.includes('Gravação')
            );

            if (recordButton) {
                console.log('✅ Botão de gravação encontrado!');
                console.log('   Texto:', recordButton.textContent);
                console.log('   Disabled:', recordButton.disabled);
                console.log('   Display:', window.getComputedStyle(recordButton).display);
                console.log('   Visibility:', window.getComputedStyle(recordButton).visibility);
                console.log('   Pointer-events:', window.getComputedStyle(recordButton).pointerEvents);

                // Tentar clicar programaticamente
                console.log('\n🧪 Tentando clicar programaticamente...');
                recordButton.click();
                console.log('✅ Click() executado. Verifique se funcionou!');
            } else {
                console.warn('⚠️ Botão de gravação não encontrado');
                console.log('→ Você provavelmente precisa fazer LOGIN na extensão primeiro');
                console.log('→ Ou o sidebar está MINIMIZADO (clique no ícone para expandir)');
            }
        }
    }
}

console.log('\n=== FIM DO DIAGNÓSTICO ===');
