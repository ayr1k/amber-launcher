// SPDX-License-Identifier: MPL-2.0
// Windows helper using the pinned MIT-licensed xpple/cubiomes backend.
#include "vendor/cubiomes/generator.h"
#include "vendor/cubiomes/finders.h"
#include "vendor/cubiomes/util.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
static int types[]={Village,Desert_Pyramid,Jungle_Temple,Swamp_Hut,Igloo,Monument,Mansion,Outpost,Ocean_Ruin,Shipwreck,Ruined_Portal,Ancient_City,Treasure,Trail_Ruins,Trial_Chambers,Abandoned_Camp,Fortress,Bastion,Ruined_Portal_N,End_City};
static const char *names[]={"village","desert_pyramid","jungle_temple","swamp_hut","igloo","monument","mansion","outpost","ocean_ruin","shipwreck","ruined_portal","ancient_city","treasure","trail_ruins","trial_chambers","abandoned_camp","fortress","bastion","nether_portal","end_city"};
int main(int argc,char **argv){
 if(argc==2&&!strcmp(argv[1],"catalog")){
  unsigned char colors[256][3];initBiomeColors(colors);printf("{\"versions\":[");
  for(int v=MC_1_7;v<=MC_NEWEST;v++)printf("%s{\"id\":%d,\"name\":\"%s\"}",v==MC_1_7?"":",",v,mc2str(v));
  printf("],\"biomes\":[");int first=1;for(int b=0;b<256;b++){const char *n=biome2str(MC_NEWEST,b);if(!n)continue;printf("%s{\"id\":%d,\"name\":\"%s\",\"color\":[%d,%d,%d]}",first?"":",",b,n,colors[b][0],colors[b][1],colors[b][2]);first=0;}printf("]}");return 0;
 }
 if(argc!=12)return 2;
 uint64_t seed=(uint64_t)strtoll(argv[1],NULL,10);int mc=atoi(argv[2]),dim=atoi(argv[3]),x=atoi(argv[4]),z=atoi(argv[5]),s=atoi(argv[6]),w=atoi(argv[7]),h=atoi(argv[8]),y=atoi(argv[9]),terrain=atoi(argv[10]),structures=atoi(argv[11]);
 if(mc<MC_1_7||mc>MC_NEWEST||dim< -1||dim>1||s<1||s>4096||w<1||h<1||w>256||h>256||abs(x)>30000000||abs(z)>30000000)return 3;
 Generator g;setupGenerator(&g,mc,0);applySeed(&g,dim,seed);int n=w*h,*ids=malloc(sizeof(int)*n);if(!ids)return 4;
 if(s==1||s==4||s==16||s==64||(s==256&&dim==0)){
  Range r={s,(int)floor((double)x/s),(int)floor((double)z/s),w,h,s==1?y:(int)floor(y/4.0),1};int *cache=allocCache(&g,r);if(!cache){free(ids);return 4;}if(genBiomes(&g,cache,r)){free(cache);free(ids);return 5;}memcpy(ids,cache,sizeof(int)*n);free(cache);
 }else for(int j=0;j<h;j++)for(int i=0;i<w;i++)ids[j*w+i]=getBiomeAt(&g,4,(int)floor((x+i*s)/4.0),(int)floor(y/4.0),(int)floor((z+j*s)/4.0));
 printf("{\"biomes\":[");for(int i=0;i<n;i++)printf("%s%d",i?",":"",ids[i]);free(ids);printf("],\"heights\":[");
 if(terrain&&dim==0&&mc>=MC_1_18){for(int j=0;j<h;j+=4)for(int i=0;i<w;i+=4){float height;mapApproxHeight(&height,NULL,&g,NULL,(int)floor((x+i*s)/4.0),(int)floor((z+j*s)/4.0),1,1);printf("%s%.1f",i||j?",":"",height);}}
 printf("],\"features\":[");int count=0;
 Pos strongholds[128];int strongholdCount=0;
 const int nt=(int)(sizeof(types)/sizeof(types[0]));
 const char *status[21];double regions[21]={0};int scanned[21]={0},emitted[21]={0};
 for(int t=0;t<=nt;t++)status[t]=structures?"unsupported":"disabled";
 // Strongholds are a sequential, biome-validated search, not a region structure.
 // Iterate before the feature cap so this sparse, useful layer is never starved.
 if(structures&&dim==0){
  StrongholdIter sh;initFirstStronghold(&sh,mc,seed);
  int total=mc>=MC_1_9?128:3;regions[nt]=total;status[nt]="complete";
  for(int i=0;i<total;i++){
   nextStronghold(&sh,&g);scanned[nt]++;
   Pos p=sh.pos;strongholds[strongholdCount++]=p;
   if(p.x>=x&&p.z>=z&&p.x<x+w*s&&p.z<z+h*s){
    printf("%s{\"type\":\"stronghold\",\"x\":%d,\"z\":%d}",count?",":"",p.x,p.z);count++;emitted[nt]++;
   }
  }
 }
 if(structures){for(int t=0;t<nt;t++){
  StructureConfig cfg;if(!getStructureConfig(types[t],mc,&cfg)||cfg.dim!=dim)continue;
  int size=cfg.regionSize*16;if(size<1)continue;
  int a=(int)floor((double)x/size),b=(int)floor((double)z/size),c=(int)floor((double)(x+w*s)/size),d=(int)floor((double)(z+h*s)/size);
  regions[t]=(c-a+1)*(double)(d-b+1);
  if(regions[t]>1600){status[t]="region_limit";continue;}
  status[t]="complete";
  for(int rz=b;rz<=d;rz++)for(int rx=a;rx<=c;rx++){
   if(count>=1200){status[t]="feature_limit";goto next_type;}
   scanned[t]++;Pos p;
   if(getStructurePos(types[t],mc,seed,rx,rz,&p)&&p.x>=x&&p.z>=z&&p.x<x+w*s&&p.z<z+h*s&&isViableStructurePos(types[t],&g,p.x,p.z,0)){
    printf("%s{\"type\":\"%s\",\"x\":%d,\"z\":%d}",count?",":"",names[t],p.x,p.z);count++;emitted[t]++;
   }
  }
  next_type:;
 }}
 printf("],\"strongholds\":[");
 for(int i=0;i<strongholdCount;i++)printf("%s{\"type\":\"stronghold\",\"x\":%d,\"z\":%d}",i?",":"",strongholds[i].x,strongholds[i].z);
 printf("],\"structureStatus\":[");
 for(int t=0;t<=nt;t++)printf("%s{\"type\":\"%s\",\"status\":\"%s\",\"regions\":%.0f,\"scanned\":%d,\"count\":%d}",t?",":"",t==nt?"stronghold":names[t],status[t],regions[t],scanned[t],emitted[t]);
 printf("],\"slime\":[");int slime=0;if(dim==0&&s<=16){for(int cz=(int)floor(z/16.0);cz<=(z+h*s)/16;cz++)for(int cx=(int)floor(x/16.0);cx<=(x+w*s)/16;cx++)if(isSlimeChunk(seed,cx,cz)){printf("%s[%d,%d]",slime?",":"",cx,cz);slime++;}}
 printf("]}");return 0;
}
