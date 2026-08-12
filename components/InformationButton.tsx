"use client";
import {useState} from "react";

interface Props {
    info: string,
    hover: boolean,
}
export default function InfoButton({info, hover}:Props){
    const [isHovered, setIsHovered] = useState(false);
    if(!hover || !info){
        return(
        <button className="info-btn">
            <span className="icon">i</span>
        </button>
    )
    }

    else{
        return(
            <div>
                {isHovered &&
                    <span className = "info-hover">
                        <p>{info}</p>
                    </span>
                }
                <button onClick={() => setIsHovered(!isHovered)}
                        className="info-btn" >
                    <span className="icon">i</span>
                </button>

            </div>

        )
    }

}
