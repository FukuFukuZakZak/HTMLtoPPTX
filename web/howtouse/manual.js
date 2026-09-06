(() => {
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('nav a[data-chapter]')];
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const zoom = document.querySelector('#zoom');
  let current = 0;
  function render(focus) {
    const found = chapters.findIndex(c => '#' + c.id === location.hash);
    current = found < 0 ? 0 : found;
    chapters.forEach((c,i) => {c.hidden = i !== current;});
    links.forEach((a,i) => {if(i === current) a.setAttribute('aria-current','step'); else a.removeAttribute('aria-current');});
    prev.disabled = current === 0;
    next.disabled = current === chapters.length-1;
    document.querySelector('#position').textContent = `${current+1} / ${chapters.length}　${links[current].textContent.slice(2)}`;
    if(focus) chapters[current].querySelector('h2').focus();
  }
  document.body.classList.add('enhanced');
  document.querySelector('.pager').hidden = false;
  prev.addEventListener('click',()=> {if(current>0) location.hash = chapters[current-1].id;});
  next.addEventListener('click',()=> {if(current<chapters.length-1) location.hash = chapters[current+1].id;});
  window.addEventListener('hashchange',()=>render(true));
  document.querySelectorAll('.screenshot').forEach(button => button.addEventListener('click',()=>{
    const shot = document.createElement('div');
    shot.className = 'zoom-shot';
    [...button.children].forEach(child => shot.append(child.cloneNode(true)));
    document.querySelector('#zoom-title').textContent = chapters[current].querySelector('h2').textContent;
    document.querySelector('#zoom-body').replaceChildren(shot);
    zoom.showModal();
  }));
  render(false);
})();
