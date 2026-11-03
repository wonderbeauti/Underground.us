(() => {
  const endpoint = 'https://formspree.io/f/mljjozqz';
  const dialog = document.querySelector('#feedback-dialog');
  const toggle = document.querySelector('#feedback-toggle');
  const close = document.querySelector('#feedback-close');
  const form = document.querySelector('#feedback-form');
  const comment = document.querySelector('#feedback-comment');
  const nickname = document.querySelector('#feedback-nickname');
  const submit = document.querySelector('#feedback-submit');
  const status = document.querySelector('#feedback-status');
  const toast = document.querySelector('#feedback-toast');
  let toastTimer;

  function mostrarNotificacion(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove('is-visible');
    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => {
        toast.hidden = true;
      }, 180);
    }, 4200);
  }

  function abrirFormulario() {
    status.textContent = '';
    dialog.showModal();
    comment.focus();
  }

  function cerrarFormulario() {
    if (dialog.open) dialog.close();
    toggle.focus();
  }

  toggle.addEventListener('click', abrirFormulario);
  close.addEventListener('click', cerrarFormulario);
  comment.addEventListener('input', () => comment.setCustomValidity(''));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const commentValue = comment.value.trim();
    if (!commentValue) {
      comment.setCustomValidity('Escribe un comentario o reporte.');
      comment.reportValidity();
      return;
    }

    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = '';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: commentValue,
          nickname: nickname.value.trim() || 'Jugador Anónimo',
        }),
      });

      if (!response.ok) {
        throw new Error(`Formspree respondió con estado ${response.status}.`);
      }

      form.reset();
      cerrarFormulario();
      mostrarNotificacion('Gracias. Tu mensaje fue enviado.');
    } catch (error) {
      console.error('No se pudo enviar el comentario a Formspree.', error);
      status.textContent = 'No se pudo enviar el mensaje. Revisa tu conexión e inténtalo de nuevo.';
    } finally {
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
})();
