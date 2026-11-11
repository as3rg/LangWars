"""Correct reference implementations for seed verification; never served to players."""

TASK_SOLUTIONS = {
    "shared-sum": "@solution fn <int,int> sum_answer(left,right){return left+right;}",
    "cyclic-access": "@solution fn <list,int> cyclic_answer(items,index){return get(items,index);}",
    "list-sum": """@solution fn <list> list_answer(items){
        let total=0; let index=0;
        while(index<length(items)){total=total+get(items,index);index=index+1;}
        return total;
    }""",
    "mirror-text": """@solution fn <string> mirror_answer(text){
        let result="";let index=length(text)-1;
        while(index>=0){result=concat(result,get(text,index));index=index-1;}
        return result;
    }""",
    "positive-count": """@solution fn <list> positive_count_answer(items){
        let count=0;let index=0;
        while(index<length(items)){if(get(items,index)>0){count=count+1;}index=index+1;}
        return count;
    }""",
    "range-total": """@solution fn <int,int> range_total_answer(low,high){
        let total=0;let current=low;
        while(current<=high){total=total+current;current=current+1;}
        return total;
    }""",
    "text-window": """@solution fn <string,int,int> text_window_answer(text,start,count){
        let result="";let index=0;
        while(index<count){result=concat(result,get(text,start+index));index=index+1;}
        return result;
    }""",
    "unique-values": """@solution fn <list> unique_values_answer(items){
        let result=[];let index=0;
        while(index<length(items)){
            let item=get(items,index);
            if(not contains(result,item)){push_back(result,item);}
            index=index+1;
        }
        return result;
    }""",
    "dictionary-tally": """@solution fn <list> dictionary_tally_answer(items){
        let result={};let index=0;
        while(index<length(items)){
            let item=get(items,index);set(result,item,get(result,item)+1);index=index+1;
        }
        return result;
    }""",
    "running-median": """@solution fn <list> running_median_answer(items){
        let ordered=[];let medians=[];let cursor=0;
        while(cursor<length(items)){
            push_back(ordered,get(items,cursor));
            let position=length(ordered)-1;
            while(position>0){
                if(get(ordered,position)<get(ordered,position-1)){
                    let temporary=get(ordered,position);
                    set(ordered,position,get(ordered,position-1));
                    set(ordered,position-1,temporary);
                }
                position=position-1;
            }
            push_back(medians,get(ordered,(length(ordered)-1)/2));cursor=cursor+1;
        }
        return medians;
    }""",
}
