(() => {
  const items = [...document.querySelectorAll("#checklist-items input[type=checkbox]")];
  const update = () => {
    const done = items.filter(item => item.checked).length;
    document.getElementById("checklist-count").textContent = `${done} de ${items.length} concluídos`;
    document.getElementById("check-progress-bar").style.width = `${done / items.length * 100}%`;
  };
  items.forEach(item => item.addEventListener("change", update));
  update();

  const links = [...document.querySelectorAll(".side-nav a")];
  const sections = links.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id));
      }
    });
  }, { rootMargin: "-20% 0px -65% 0px" });
  sections.forEach(section => observer.observe(section));
})();
