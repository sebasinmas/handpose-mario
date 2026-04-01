const MARIO_ENTRYPOINT = "./mario/";

function showRedirectMessage() {
  document.body.innerHTML = `
    <main style="font-family: Arial, sans-serif; color: #f5f5f5; text-align: center; padding: 40px;">
      <h1 style="margin-bottom: 12px;">Redirigiendo al proyecto de Mario...</h1>
      <p style="margin-bottom: 20px;">Si no cambia automaticamente, abre el proyecto principal aqui:</p>
      <p><a href="${MARIO_ENTRYPOINT}" style="color: #9ad1ff; font-size: 18px;">${MARIO_ENTRYPOINT}</a></p>
    </main>
  `;
}

showRedirectMessage();
window.location.replace(MARIO_ENTRYPOINT);
