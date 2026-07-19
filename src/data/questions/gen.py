import json, os
OUT = r"C:/Users/NET/.gemini/antigravity/playground/SKD_WEB/src/data/questions"
os.makedirs(OUT, exist_ok=True)
def mk(id,cat,sub,text,opts,correct,expl,xp=10,coin=5):
    return {"id":id,"category":cat,"sub":sub,"text":text,"options":[{"id":k,"text":v[0],"score":v[1]} for k,v in opts.items()],"correct":correct,"explanation":expl,"xp_reward":xp,"coin_reward":coin}
