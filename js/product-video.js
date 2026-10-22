/* Shared Aubjective video cards: create the YouTube player only near the viewport.
   Browsers generally require autoplay to start muted. Visitors can unmute via controls. */
(function(){
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const makeFrame=(holder,autoplay)=>{
    const id=holder.dataset.youtube;
    if(!id||holder.querySelector('iframe'))return;
    const frame=document.createElement('iframe');
    frame.title=holder.dataset.videoTitle||'Product demonstration';
    frame.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)
      +'?autoplay='+(autoplay?'1':'0')
      +'&mute='+(autoplay?'1':'0')
      +'&loop=1&playlist='+encodeURIComponent(id)
      +'&controls=1&playsinline=1&rel=0';
    frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    holder.append(frame);
  };
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      const holder=entry.target;
      if(entry.isIntersecting){
        if(!reduced)makeFrame(holder,true);
      }else{
        holder.querySelector('iframe')?.remove();
      }
    }
  },{rootMargin:'100px 0px'});
  document.querySelectorAll('[data-youtube]').forEach(holder=>{
    observer.observe(holder);
    if(reduced){
      const play=document.createElement('button');
      play.type='button';
      play.className='manual-video-play';
      play.textContent='▶ Play video';
      play.addEventListener('click',()=>{makeFrame(holder,false);play.remove()});
      holder.append(play);
    }
  });
})();
