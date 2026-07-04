let selectedFile = null;

document.getElementById('fileInput').onchange = (e) => {
  selectedFile = e.target.files[0];
  if(selectedFile) document.getElementById('fileNameDisplay').innerText = selectedFile.name;
};

document.getElementById('convertBtn').onclick = async function() {
  if(!selectedFile) return alert('Pilih fail CBZ dulu!');
  
  // Ambil elemen UI
  const format = document.querySelector('input[name="format"]:checked').value;
  const statusArea = document.getElementById('statusArea');
  const successBar = document.getElementById('successBar');
  const infoBox = document.getElementById('infoBox'); 
  const percentText = document.getElementById('percentText');
  const progressBar = document.getElementById('progressBar');
  const heroDesc = document.querySelector('.hero-desc');
  
  const width = parseInt(document.getElementById('imgWidth').value);

  // Setup UI permulaan
  this.disabled = true;
  statusArea.style.display = 'block';
  successBar.style.display = 'none';
  infoBox.style.display = 'none'; 
  if(heroDesc) heroDesc.innerHTML = `Converting to <strong>${format.toUpperCase()}</strong>... Please wait.`;

  try {
    const zipLoader = await JSZip.loadAsync(selectedFile);
    const files = Object.keys(zipLoader.files)
      .filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i))
      .sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
    
    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        let pdf = null;

        for (let i = 0; i < files.length; i++) {
          const data = await zipLoader.files[files[i]].async("blob");
          const url = URL.createObjectURL(data);
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = url; });

          const h = (img.height / img.width) * width;
          if (i === 0) {
            pdf = new jsPDF({ unit: "px", format: [width, h] });
          } else {
            pdf.addPage([width, h], 'p');
          }

          // Guna cara asal kau (Direct injection) - Kekal tajam!
          pdf.addImage(img, 'JPEG', 0, 0, width, h, undefined, 'FAST');
          URL.revokeObjectURL(url);
          
          // --- LOGIK PROGRESS & ROKET ---
          let current = i + 1; // Wajib ada ni supaya 'current' dikenali
          let total = files.length; // Wajib ada ni supaya 'total' dikenali
          let percent = Math.round((current / total) * 100);
           document.getElementById('progressBar').style.width = percent + '%';
           document.getElementById('percentText').innerText = percent + '%';
           document.getElementById('pageCounter').innerText = current + " / " + total;
          if (percent >= 50 && percent < 100) infoBox.style.display = 'block';

          // Bagi browser "bernafas" untuk elak hang
          await new Promise(r => setTimeout(r, 1));
        }
        finishDownload(pdf.output('blob'), selectedFile.name.replace('.cbz', '.pdf'));

        } else {
        const epubZip = new JSZip();
        epubZip.file("mimetype", "application/epub+zip", { compression: "STORE" });
        
        const oebps = epubZip.folder("OEBPS");
        const imgFolder = oebps.folder("images");
        let manifest = "";
        let spine = "";

        for (let i = 0; i < files.length; i++) {
          const data = await zipLoader.files[files[i]].async("blob");
          const imgName = `p${i}.jpg`;
          imgFolder.file(imgName, data);
          manifest += `<item id="i${i}" href="images/${imgName}" media-type="image/jpeg"/>`;
          spine += `<itemref idref="i${i}"/>`;
          
          // --- LOGIK PROGRESS & ROKET ---
          let percent = Math.round(((i + 1) / files.length) * 100);
          percentText.innerText = percent + '%';
          if(progressBar) progressBar.style.width = percent + '%';
          document.getElementById('pageCounter').innerText = `${i + 1} / ${files.length}`;   
          if (percent >= 50 && percent < 100) infoBox.style.display = 'block';
          
          await new Promise(r => setTimeout(r, 1));
        }

        oebps.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Comic</dc:title><dc:language>en</dc:language></metadata><manifest>${manifest}</manifest><spine>${spine}</spine></package>`);
        epubZip.folder("META-INF").file("container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
        
        const content = await epubZip.generateAsync({type:"blob", mimeType: "application/epub+zip"});
        finishDownload(content, selectedFile.name.replace('.cbz', '.epub'));
    }
  } catch (e) { 
      alert('Error: ' + e.message); 
  } finally {
      this.disabled = false;
      statusArea.style.display = 'none';
      if(infoBox) infoBox.style.display = 'none';
      if(heroDesc) heroDesc.innerHTML = "Convert your <strong>CBZ</strong> comics to <strong>PDF</strong> or <strong>EPUB</strong> instantly.";
  }
};

function finishDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const dl = document.getElementById('downloadLink');
    dl.href = url;
    dl.download = name;
    document.getElementById('successBar').style.display = 'block';
}
