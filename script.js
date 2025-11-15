let frequencyMap = {}; 
let lastDrawnNumbers = []; // Armazenará os números do último sorteio (concurso mais recente)

/**
 * Funções Auxiliares de Processamento
 */

// Função para processar o CSV e calcular a frequência
function processCSV(csvText) {
    const lines = csvText.split('\n');
    frequencyMap = {}; 
    lastDrawnNumbers = [];

    // Inicializa o mapa para todos os 25 números
    for (let i = 1; i <= 25; i++) {
        frequencyMap[i] = 0;
    }

    // A coluna de 'bola 1' geralmente começa no índice 2 da linha (após Concurso, Data)
    const startLineIndex = 7;
    const startNumberColumn = 2; // Coluna 'bola 1'

    for (let i = startLineIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(',');
        
        // As 15 bolas sorteadas estão nas colunas de índice 2 a 16
        const currentDraw = [];
        for (let j = startNumberColumn; j < startNumberColumn + 15 && j < columns.length; j++) {
            const number = parseInt(columns[j], 10);
            if (number >= 1 && number <= 25) {
                frequencyMap[number]++;
                currentDraw.push(number);
            }
        }
        
        // O primeiro registro da lista é o mais recente.
        if (i === startLineIndex) {
            lastDrawnNumbers = currentDraw;
        }
    }
    
    // Converte o mapa de frequência em um array de objetos para facilitar a ordenação
    const sortedFrequencies = Object.keys(frequencyMap)
        .map(num => ({
            number: parseInt(num),
            frequency: frequencyMap[num]
        }))
        .sort((a, b) => b.frequency - a.frequency); // Ordena do mais frequente para o menos frequente

    return sortedFrequencies;
}

// Manipulador de eventos para o input de arquivo
document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const csvText = e.target.result;
            const sortedFrequencies = processCSV(csvText);
            
            const totalSorts = sortedFrequencies.reduce((sum, item) => sum + item.frequency, 0) / 15;
            document.getElementById('statsMessage').textContent = 
                `Dados de ${Math.floor(totalSorts)} concursos processados. Último sorteio: ${lastDrawnNumbers.sort((a, b) => a - b).join(', ')}.`;
        };
        reader.readAsText(file);
    }
});


// Função utilitária para obter N elementos aleatórios de um array
function getRandomElements(arr, n) {
    const result = [];
    const tempArr = [...arr]; // Cria uma cópia para não modificar o original
    for (let i = 0; i < n && tempArr.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * tempArr.length);
        result.push(tempArr[randomIndex]);
        tempArr.splice(randomIndex, 1); // Remove o escolhido
    }
    return result;
}

/**
 * Função Principal de Geração de Jogo Refinada
 */
function generateGame() {
    if (Object.keys(frequencyMap).length === 0) {
        alert("Por favor, carregue o arquivo CSV da Lotofácil antes de gerar o jogo.");
        return;
    }
    
    // 1. Classificação dos Números por Frequência
    const sortedFrequencies = Object.keys(frequencyMap)
        .map(num => ({ number: parseInt(num), frequency: frequencyMap[num] }))
        .sort((a, b) => b.frequency - a.frequency);
        
    const allNumbers = sortedFrequencies.map(item => item.number);
    
    // Define as zonas de frequência para a estratégia
    const hottestNumbers = allNumbers.slice(0, 10); // Top 10 mais quentes
    const neutralNumbers = allNumbers.slice(10, 20); // 10 números neutros
    const coldestNumbers = allNumbers.slice(20);    // Bottom 5 (os mais frios)
    
    // 2. Estratégia de Repetição do Último Sorteio (Média de 9 ou 10)
    // Vamos repetir aleatoriamente entre 9 e 10 números do último concurso.
    const numToRepeat = Math.random() < 0.5 ? 9 : 10;
    let selectedNumbers = new Set(getRandomElements(lastDrawnNumbers, numToRepeat));
    
    // 3. Complementação do Jogo
    // Os 15 - numToRepeat restantes (cerca de 5 ou 6) serão selecionados das zonas Quente/Fria.
    let remainingToPick = 15 - selectedNumbers.size;
    
    // A. Priorizar Quentes (os Top 10)
    const hotCandidates = hottestNumbers.filter(num => !selectedNumbers.has(num));
    // Vamos forçar a inclusão de 3 números quentes que não se repetiram.
    const numHotToPick = Math.min(3, remainingToPick, hotCandidates.length);
    getRandomElements(hotCandidates, numHotToPick).forEach(num => selectedNumbers.add(num));
    remainingToPick = 15 - selectedNumbers.size;

    // B. Inclusão dos Frios (Atrasados) com Peso (1 ou 2)
    const coldCandidates = coldestNumbers.filter(num => !selectedNumbers.has(num));
    // Incluir 1 ou 2 dos 5 mais frios, representando os "atrasados".
    const numColdToPick = Math.min(Math.random() < 0.7 ? 1 : 2, remainingToPick, coldCandidates.length);
    getRandomElements(coldCandidates, numColdToPick).forEach(num => selectedNumbers.add(num));
    remainingToPick = 15 - selectedNumbers.size;

    // C. Preencher com Neutros/Restantes
    const neutralCandidates = allNumbers.filter(num => !selectedNumbers.has(num));
    getRandomElements(neutralCandidates, remainingToPick).forEach(num => selectedNumbers.add(num));

    // 4. Transformar o Set em Array e Ordenar
    let finalGame = Array.from(selectedNumbers).sort((a, b) => a - b);
    
    // 5. Balanceamento Par/Ímpar e Ajuste Final (Garantia do Padrão)
    let oddCount = finalGame.filter(n => n % 2 !== 0).length;
    let evenCount = 15 - oddCount;

    // Se o jogo gerado não tiver o padrão 7/8 ou 8/7, tentamos um ajuste
    if (oddCount < 7 || oddCount > 8) {
        
        let targetOdd = oddCount < 7 ? 7 : 8; // Queremos aumentar os ímpares (target é 7 ou 8)
        let targetEven = 15 - targetOdd;
        
        let countDifference = Math.abs(oddCount - targetOdd); // Quantos números precisamos trocar
        
        // Define se precisamos trocar Pares por Ímpares, ou Ímpares por Pares
        let numbersToSwapOut = oddCount > targetOdd 
            ? finalGame.filter(n => n % 2 !== 0) // Sobra de ímpares
            : finalGame.filter(n => n % 2 === 0); // Sobra de pares

        let candidatesToSwapIn = oddCount > targetOdd 
            ? allNumbers.filter(n => n % 2 === 0 && !finalGame.includes(n)) // Ímpares sobrando, trocamos por pares
            : allNumbers.filter(n => n % 2 !== 0 && !finalGame.includes(n)); // Pares sobrando, trocamos por ímpares

        // Troca os números para alcançar o balanço ideal (7/8 ou 8/7)
        if (candidatesToSwapIn.length >= countDifference && numbersToSwapOut.length >= countDifference) {
            
            const numbersToRemove = getRandomElements(numbersToSwapOut, countDifference);
            const numbersToAdd = getRandomElements(candidatesToSwapIn, countDifference);
            
            finalGame = finalGame.filter(n => !numbersToRemove.includes(n));
            finalGame.push(...numbersToAdd);
            finalGame.sort((a, b) => a - b);
            
            // Recalcula o balanço
            oddCount = finalGame.filter(n => n % 2 !== 0).length;
            evenCount = 15 - oddCount;
        }
        // Se a troca não foi possível, o jogo é mantido, mas sinalizado
    }
    
    // 6. Exibir Resultado
    let patternStatus = (oddCount === 7 || oddCount === 8) 
        ? "Padrão Ótimo (7/8 ou 8/7)" 
        : `Padrão Raro (Pode ser intencional se a base for pequena)`;

    const outputDiv = document.getElementById('gameOutput');
    outputDiv.innerHTML = '<h3>Jogo Gerado Estatisticamente:</h3>';
    
    finalGame.forEach(num => {
        outputDiv.innerHTML += `<span class="number">${String(num).padStart(2, '0')}</span>`;
    });
    
    outputDiv.innerHTML += `<p style="margin-top: 10px; font-weight: bold;">Ímpares/Pares: ${oddCount} / ${evenCount} (${patternStatus})</p>`;
}