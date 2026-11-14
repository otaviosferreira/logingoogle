(() => {
  const questions = [
    {q:"Qual é a principal finalidade do ID token?",a:["Autorizar chamadas a qualquer API","Representar a identidade autenticada do usuário","Armazenar a senha Google","Substituir o Client Secret"],c:1,e:"O ID token contém declarações sobre a autenticação e identidade do usuário."},
    {q:"Qual token é utilizado para acessar APIs protegidas?",a:["Access token","ID token","State","Authorization code"],c:0,e:"O access token concede acesso aos recursos cobertos pelos scopes autorizados."},
    {q:"Onde o Client Secret deve ficar armazenado?",a:["No HTML","No localStorage","Em variável de ambiente no backend","No CSS"],c:2,e:"O Client Secret é confidencial e nunca deve ser enviado ao navegador."},
    {q:"O que o Client ID representa?",a:["A senha do usuário","O identificador público da aplicação OAuth","Um token de sessão","A URL do banco"],c:1,e:"O Client ID identifica o cliente OAuth perante o Google."},
    {q:"Qual biblioteca valida o ID token neste projeto?",a:["Express Router","dotenv","google-auth-library","Bootstrap"],c:2,e:"google-auth-library verifica a assinatura e as claims do token."},
    {q:"Qual atributo é o identificador estável da conta Google?",a:["email","name","picture","sub"],c:3,e:"O claim sub é o identificador único e estável do usuário no emissor."},
    {q:"Para que serve o parâmetro state no OAuth?",a:["Evitar CSRF no callback","Guardar a senha","Definir o tema do site","Renovar o access token"],c:0,e:"O state vincula a resposta à solicitação iniciada pelo usuário."},
    {q:"Qual é a função do PKCE?",a:["Criptografar o HTML","Vincular o authorization code a um verificador","Criar uma conta Google","Substituir os scopes"],c:1,e:"PKCE usa code_verifier e code_challenge para proteger a troca do código."},
    {q:"Qual cookie é adequado para uma sessão protegida?",a:["Cookie legível pelo JavaScript","Cookie HttpOnly e Secure em HTTPS","Token salvo no localStorage","Cookie sem expiração"],c:1,e:"HttpOnly reduz acesso via JavaScript e Secure exige transporte HTTPS."},
    {q:"O que deve acontecer no logout seguro?",a:["Apagar só o nome da tela","Decodificar o ID token no frontend","Destruir a sessão no servidor e limpar o cookie","Desativar o Client ID"],c:2,e:"O servidor invalida a sessão; o navegador recebe a remoção do cookie."}
  ];
  let index = 0, correct = 0, answered = false, player = "";
  const $ = id => document.getElementById(id);
  function showQuestion() {
    answered = false;
    const item = questions[index];
    $("quiz-counter").textContent = `Questão ${index + 1} de ${questions.length}`;
    $("quiz-score").textContent = `${correct} acertos`;
    $("quiz-progress-bar").style.width = `${index / questions.length * 100}%`;
    $("quiz-question").textContent = item.q;
    $("quiz-feedback").textContent = "";
    $("quiz-feedback").className = "quiz-feedback";
    $("quiz-next").classList.add("hidden");
    $("quiz-options").innerHTML = "";
    item.a.forEach((answer, i) => {
      const button = document.createElement("button");
      button.className = "quiz-option";
      button.textContent = String.fromCharCode(65 + i) + ". " + answer;
      button.addEventListener("click", () => choose(i));
      $("quiz-options").appendChild(button);
    });
  }
  function choose(choice) {
    if (answered) return;
    answered = true;
    const item = questions[index];
    const buttons = [...$("quiz-options").children];
    buttons.forEach((button, i) => {
      button.disabled = true;
      if (i === item.c) button.classList.add("correct");
      else if (i === choice) button.classList.add("incorrect");
    });
    if (choice === item.c) {
      correct++;
      $("quiz-feedback").textContent = "Correto! " + item.e;
      $("quiz-feedback").classList.add("good");
    } else {
      $("quiz-feedback").textContent = "Não foi dessa vez. " + item.e;
      $("quiz-feedback").classList.add("bad");
    }
    $("quiz-score").textContent = `${correct} acertos`;
    $("quiz-next").textContent = index === questions.length - 1 ? "Ver resultado →" : "Próxima questão →";
    $("quiz-next").classList.remove("hidden");
  }
  function finish() {
    $("quiz-game").classList.add("hidden");
    $("quiz-result").classList.remove("hidden");
    const wrong = questions.length - correct;
    $("result-title").textContent = `Parabéns, ${player}!`;
    $("result-correct").textContent = correct;
    $("result-wrong").textContent = wrong;
    $("result-message").textContent = correct >= 8 ? "Excelente domínio dos conceitos de autenticação!" : "Continue estudando os fluxos e tente novamente.";
    $("quiz-progress-bar").style.width = "100%";
  }
  $("quiz-begin").addEventListener("click", () => {
    player = $("quiz-name").value.trim() || "Estudante";
    index = 0; correct = 0;
    $("quiz-start").classList.add("hidden");
    $("quiz-result").classList.add("hidden");
    $("quiz-game").classList.remove("hidden");
    showQuestion();
  });
  $("quiz-next").addEventListener("click", () => {
    index++;
    if (index >= questions.length) finish();
    else showQuestion();
  });
  $("quiz-restart").addEventListener("click", () => {
    $("quiz-result").classList.add("hidden");
    $("quiz-start").classList.remove("hidden");
    $("quiz-name").value = "";
  });
})();
