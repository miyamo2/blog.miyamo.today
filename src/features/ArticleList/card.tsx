import React, {FC} from "react";
import {Link} from "gatsby";
import { Image } from "@unpic/react";

interface ArticleListCardProps {
    id: string;
    title: string;
    thumbnailUrl: string;
    createdAt: string;
    updatedAt: string;
    tagNames: string[];
}

export const ArticleListCard: FC<ArticleListCardProps> = (props: ArticleListCardProps) => (
         (<div className="card-primary card-compact md:w-48 lg:w-96 bg-base-100 shadow-xl object-cover border-solid">
            <Link to={`articles/${props.id}`}>
                <Image
                    src={props.thumbnailUrl}
                    alt={props.id}
                    height={300} width={300}
                    layout={"constrained"}
                    srcSet={
                        `${props.thumbnailUrl}, 
                        ${props.thumbnailUrl} 640px, 
                        ${props.thumbnailUrl} 768px,
                        ${props.thumbnailUrl} 1024px,
                        ${props.thumbnailUrl} 1280px,
                        ${props.thumbnailUrl} 1536px
                        `}
                />
            <div className="card-body">
                <h2 className="card-title">
                    {props.title}
                </h2>
                <div className="card-actions justify-end">
                    {props.tagNames.map((tagName) => (
                            <span key={tagName} className={"inline-block bg-gray-200"}>{tagName}</span>
                        )
                    )}
                </div>
            </div>
            </Link>
        </div>)
);

export const ArticleListCard2: FC<ArticleListCardProps> = (props: ArticleListCardProps) => (
    (<div className={"card-side card-bordered bg-base-100 shadow-xl"}>
        <figure>
            <Image
                src={props.thumbnailUrl}
                alt={props.id}
                height={200} width={250}
                layout={"constrained"}
                srcSet={
                    `${props.thumbnailUrl}, 
                        ${props.thumbnailUrl} 640px, 
                        ${props.thumbnailUrl} 768px,
                        ${props.thumbnailUrl} 1024px,
                        ${props.thumbnailUrl} 1280px,
                        ${props.thumbnailUrl} 1536px
                        `}/>
        </figure>
        <div className={"card-body"}>
            <h1 className={"card-title"}>
                {props.title}
            </h1>
            <div className={"card-actions"}>
                <ul>
                    {props.tagNames.map((tagName) => (
                        <li id={`${props.id}-${tagName}`} className={"badge badge-outline"}>#{tagName}</li>
                    ))}
                </ul>
            </div>
        </div>
    </div>)
);