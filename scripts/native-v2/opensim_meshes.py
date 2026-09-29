"""Convert only XML-referenced, authorized native ARMS VTP meshes to web JSON."""
import argparse,json,hashlib
from pathlib import Path
import xml.etree.ElementTree as E
import numpy as np

def main():
    p=argparse.ArgumentParser();p.add_argument('--model-json',required=True);p.add_argument('--geometry',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    model=json.loads(Path(a.model_json).read_text());root=Path(a.geometry);meshes=[];geoms=[];missing=[]
    for i,entry in enumerate(model['meshEntries']):
        path=root/entry['file']
        if not path.exists():missing.append(entry);continue
        vtk=E.fromstring(path.read_text());points=vtk.find('.//Points/DataArray');polys=vtk.findall('.//Polys/DataArray')
        if points.get('format')!='ascii' or any(p.get('format')!='ascii' for p in polys):raise ValueError('Only unmodified ascii VTP supported: '+path.name)
        xyz=np.fromstring(points.text,sep=' ').reshape(-1,3);conn=np.fromstring(next(x.text for x in polys if x.get('Name')=='connectivity'),sep=' ',dtype=int);offset=np.fromstring(next(x.text for x in polys if x.get('Name')=='offsets'),sep=' ',dtype=int)
        faces=[];start=0
        for end in offset:
            indices=conn[start:end];start=end
            if len(indices)<3:raise ValueError('Invalid native surface polygon')
            # Display-only fan triangulation; original vertex coordinates unchanged.
            for j in range(1,len(indices)-1):faces.append([int(indices[0]),int(indices[j]),int(indices[j+1])])
        if not np.isfinite(xyz).all() or conn.min()<0 or conn.max()>=len(xyz):raise ValueError('Invalid native mesh')
        mid='arms-'+path.stem;meshes.append({'id':mid,'vertices':xyz.tolist(),'faces':faces,'sourceFile':path.name,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'units':'m','nativeCoordinateScale':1,'polygonTriangulation':'fan for native n-gons; native vertex positions unchanged; display only'})
        sx,sy,sz=entry['scaleFactors'];geoms.append({'id':'arms-geom-'+str(i),'bodyId':entry['body'],'meshId':mid,'localMatrix':[sx,0,0,0,0,sy,0,0,0,0,sz,0,0,0,0,1],'defaultVisible':entry['body'] not in ['clavicle','scapula','humerus'],'nativeFile':path.name})
    asset={'modelId':model['modelId'],'modelHash':model['modelHash'],'meshes':meshes,'geoms':geoms,'missing':missing,'licenseAttribution':model['licenseAttribution'],'sourceOrigin':'ARMS Wrist Hand Model 4.3 Geometry distribution; only exact filenames referenced by selected left-hand derivative.','sourceUrl':'https://simtk.org/projects/arms_hand_model','transformConvention':'Mesh vertices in native local metres; XML scaleFactors applied in geom.localMatrix; frame.bodyTransforms are row-major native body-to-ground4x4.','meshCoordinateCheck':'No hand mirroring/rotation baked into mesh. Selected native model body transforms include its original derivative frame settings.'}
    Path(a.output).write_text(json.dumps(asset,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n');print({'meshes':len(meshes),'triangles':sum(len(m['faces']) for m in meshes),'missing':len(missing),'bytes':Path(a.output).stat().st_size})

if __name__=='__main__':main()
