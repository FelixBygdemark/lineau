document.querySelectorAll('.carousel-dots .dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.carousel-dots .dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
  });
});



