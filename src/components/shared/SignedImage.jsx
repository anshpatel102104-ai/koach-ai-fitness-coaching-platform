import React, { forwardRef, useEffect, useState } from 'react';
import { isStorageRef, peekSignedUrl, resolveFileUrl } from '@/lib/storageUrls';

/**
 * Resolve a stored file value (`storage://uploads/...` reference, public URL,
 * or external URL) to a loadable URL. Returns undefined while a private file
 * is being signed or if signing fails (e.g. no access).
 */
export function useSignedUrl(value) {
  const [url, setUrl] = useState(() => peekSignedUrl(value));
  useEffect(() => {
    let live = true;
    const immediate = peekSignedUrl(value);
    setUrl(immediate);
    if (!immediate && isStorageRef(value)) {
      resolveFileUrl(value).then((u) => { if (live) setUrl(u); }).catch(() => { if (live) setUrl(undefined); });
    }
    return () => { live = false; };
  }, [value]);
  return url;
}

/** Drop-in `<img>` that accepts stored references. */
/** @type {React.ForwardRefExoticComponent<any>} */
export const SignedImg = forwardRef(function SignedImg({ src, ...props }, ref) {
  const url = useSignedUrl(src);
  return <img ref={ref} src={url} {...props} />;
});

/** Drop-in `<video>` / `<audio>` / `<iframe>` equivalents. */
/** @type {React.ForwardRefExoticComponent<any>} */
export const SignedVideo = forwardRef(function SignedVideo({ src, poster, ...props }, ref) {
  const url = useSignedUrl(src);
  const posterUrl = useSignedUrl(poster);
  return <video ref={ref} src={url} poster={posterUrl} {...props} />;
});

/** @type {React.ForwardRefExoticComponent<any>} */
export const SignedAudio = forwardRef(function SignedAudio({ src, ...props }, ref) {
  const url = useSignedUrl(src);
  return <audio ref={ref} src={url} {...props} />;
});

/** @type {React.ForwardRefExoticComponent<any>} */
export const SignedIframe = forwardRef(function SignedIframe({ src, ...props }, ref) {
  const url = useSignedUrl(src);
  return <iframe ref={ref} src={url} {...props} />;
});



/** Drop-in `<a>` whose href may be a stored reference (e.g. open a photo/PDF). */
/** @type {React.ForwardRefExoticComponent<any>} */
export const SignedLink = forwardRef(function SignedLink({ href, ...props }, ref) {
  const url = useSignedUrl(href);
  return <a ref={ref} href={url} {...props} />;
});
export default SignedImg;
