document.addEventListener('DOMContentLoaded', () => {
  const loginTitle = document.querySelector('#login-section h2');
  const originalText = loginTitle.textContent;
  loginTitle.textContent = '';
  
  let i = 0;
  const typeWriter = () => {
    if (i < originalText.length) {
      loginTitle.textContent += originalText.charAt(i);
      i++;
      setTimeout(typeWriter, 100);
    }
  };
  
  typeWriter();
});