import {v2 as cloudinary} from 'cloudinary';
const configured=Boolean(process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET);
if(configured)cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
export const mediaStatus=()=>({provider:configured?'cloudinary':'url',configured});
export async function uploadEquipmentImage(dataUri:string){if(!configured)throw Object.assign(new Error('Image uploads are not configured. Add Cloudinary credentials or use an image URL.'),{status:503});const result=await cloudinary.uploader.upload(dataUri,{folder:'boro/equipment',resource_type:'image'});return {url:result.secure_url,publicId:result.public_id,width:result.width,height:result.height};}
