// SwiftLaTeX shared configuration and utilities
// Edit this file to change settings and shared functionality for all engines

// Configuration
self.SWIFTLATEX_CONFIG = {
    texlive_endpoint: "/lib/"
};

// Shared cache objects
let texlive404_cache = {};
let texlive200_cache = {};
let pk404_cache = {};
let pk200_cache = {};

// Shared kpse_find_file_impl function
function kpse_find_file_impl(nameptr, format, _mustexist, enginePath) {
    let reqname = UTF8ToString(nameptr);
    
    // Handle dvipdfm special case
    if (reqname.startsWith("/tex/")) {
        reqname = reqname.substr(5);
    }
    
    if (reqname.includes("/")) {
        return 0;
    }
    
    const cacheKey = format + "/" + reqname;
    if (cacheKey in texlive404_cache) {
        return 0;
    }
    
    if (cacheKey in texlive200_cache) {
        const savepath = texlive200_cache[cacheKey];
        return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
    }
    
    const remote_url = self.texlive_endpoint + enginePath + "/" + cacheKey;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", remote_url, false);
    xhr.timeout = 15e4;
    xhr.responseType = "arraybuffer";
    console.log("Start downloading texlive file " + remote_url);
    
    try {
        xhr.send();
    } catch (err) {
        console.log("TexLive Download Failed " + remote_url);
        return 0;
    }
    
    if (xhr.status === 200) {
        let arraybuffer = xhr.response;
        let fileid;
        let savepath;
        
        // Different file naming strategies
        try {
            fileid = new URL(xhr.responseURL).pathname.split("/").pop();
            savepath = TEXCACHEROOT + "/" + fileid;
        } catch (e) {
            // Fallback for dvipdfm approach
            fileid = cacheKey.replace(/\//g, "_");
            savepath = TEXCACHEROOT + "/" + fileid;
        }
        
        FS.writeFile(savepath, new Uint8Array(arraybuffer));
        texlive200_cache[cacheKey] = savepath;
        return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
    } else if (xhr.status === 301 || xhr.status === 404) {
        console.log("TexLive File not exists " + remote_url);
        texlive404_cache[cacheKey] = 1;
        return 0;
    }
    
    return 0;
}

// Shared kpse_find_pk_impl function (for pdftex)
function kpse_find_pk_impl(nameptr, dpi) {
    const reqname = UTF8ToString(nameptr);
    if (reqname.includes("/")) {
        return 0;
    }
    
    const cacheKey = dpi + "/" + reqname;
    if (cacheKey in pk404_cache) {
        return 0;
    }
    
    if (cacheKey in pk200_cache) {
        const savepath = pk200_cache[cacheKey];
        return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
    }
    
    const remote_url = self.texlive_endpoint + "pdftex/pk/" + cacheKey;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", remote_url, false);
    xhr.timeout = 15e4;
    xhr.responseType = "arraybuffer";
    console.log("Start downloading texlive file " + remote_url);
    
    try {
        xhr.send();
    } catch (err) {
        console.log("TexLive Download Failed " + remote_url);
        return 0;
    }
    
    if (xhr.status === 200) {
        let arraybuffer = xhr.response;
        const pkid = xhr.getResponseHeader("pkid");
        const savepath = TEXCACHEROOT + "/" + pkid;
        FS.writeFile(savepath, new Uint8Array(arraybuffer));
        pk200_cache[cacheKey] = savepath;
        return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
    } else if (xhr.status === 301 || xhr.status === 404) {
        console.log("TexLive File not exists " + remote_url);
        pk404_cache[cacheKey] = 1;
        return 0;
    }
    
    return 0;
}