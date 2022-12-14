import "./Attributes.css";
import { useState } from "react";
import { Attribute, GBPObject } from "./schema";
import { Highlight } from "react-instantsearch-hooks-web";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";

interface DetailSectionProps {
  attribute: Attribute;
  hit: GBPObject;
}

function nothingToSee(value) {
  const nTS =
    ( value == undefined ||
      value == null ||
      value == "" ||
      typeof(value) == 'symbol' ||
      typeof(value) == 'function' ||
      Array.isArray(value) && value.length == 0 ||
      typeof (value) == 'object' && Object.entries(value).length == 0 ||
      typeof (value) == 'object' && Object.keys(value).every(k => nothingToSee(value[k]))
    );
  return nTS;
}

/**
 * Renders a single section in the Details view, for one attribute.
 */
export function AttributeView({ attribute, hit }: DetailSectionProps) {
  if (!attribute.id && !attribute.attributes) {
    return <PropValHighlights hit={hit} attribute={attribute} />;
  }

  const isCollection = attribute.id && !!attribute.attributes;

  const count = isCollection && hit[attribute?.id]?.length | 0;

  if (isCollection && count == 0) return null;
  // Do not show attribute sets when all attributes are empty.
  if (!isCollection && attribute.attributes.every(a => nothingToSee(hit[a.id]))) return null;

  return (
    <AttributeCollapsible
      attribute={attribute}
      showCount={isCollection}
      count={count}
    >
      {isCollection ? (
        <AttributeCollection collection={attribute} hit={hit} />
      ) : (
        // The attribute represents an unidentified list of property-value combinations
        attribute.attributes.map(
          (att) =>
            att &&
            att.name &&
            att.id && (
              <PropValHighlights
                key={`${att.name} ${att.id}`}
                hit={hit}
                attribute={att}
              />
            )
        )
      )}
    </AttributeCollapsible>
  );
}

interface AttributeTitleProps {
  attribute: Attribute;
  showCount?: boolean;
  count?: number;
  children?: React.ReactNode;
}

export function AttributeCollapsible({
  attribute,
  showCount,
  count,
  children,
}: AttributeTitleProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="Attribute">
      <div className="Attribute__title" onClick={() => setOpen(!open)}>
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />} {attribute.name}{" "}
        {showCount && `(${count})`}
      </div>
      {<div className={"Attribute__content__"+(open ? "open" : "closed")}>{children}</div>}
    </div>
  );
}

function AttributeCollection({ hit, collection }) {
  const items = hit[collection.id];
  if (!items) return null;
  return (
    <div className="Attribute__list">
      {items.map((item, i) => (
        <AttributeItem
          key={`${item.id}${i}`}
          hit={hit}
          attribute={collection}
          item={item}
          collection={collection}
          i={i}
        />
      ))}
    </div>
  );
}

function AttributeItem({ hit, attribute, item, collection, i }) {
  const [open, setOpen] = useState(false);

  const title = item[collection.attributes[0].id];

  return (
    <div className="Attribute__item" key={`${item.id}${i}`}>
      <h4 className="Attribute__item__title" onClick={() => setOpen(!open)}>
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        {title}
      </h4>
      {open &&
        collection.attributes.map((attribute) => (
          // We can't use Highlight here, or maybe we can, but I don't know how to pass a path for
          // a resource that is stored in an array (e.g. `prop[0].subProp`) to the `Highlight` component.
          <PropVal
            key={attribute.name}
            item={item[attribute.id]}
            attribute={attribute}
          />
        ))}
    </div>
  );
}

/** A single highlighted prop-val */
function PropValHighlights({ hit, attribute }) {
  if (!hit || nothingToSee(hit[attribute.id])) return null;
  return (
    <div className="Attribute__propval">
      <div className="Attribute__propval__key">{attribute.name}</div>
      <div className="Attribute__propval__value">
        { (attribute.type == "URL")
        ? (<a href={hit[attribute.id]} target="_blank">&#x2B77;</a>)
        : <Highlight
            key={`val-${attribute.id}`}
            attribute={attribute.id}
            // @ts-ignore
            hit={hit}
            // @ts-ignore
            tagname="mark"
          />
        }
      </div>
    </div>
  );
}

function PropVal({ item, attribute }) {
  if (!item) return null;
  return (
    <div className="Attribute__propval">
      <div className="Attribute__propval__key">{attribute.name}</div>
      <div className="Attribute__propval__value">
        { (attribute.type == "URL")
        ? (<a href={item.toString()} target="_blank">&#x2B77;</a>)
        : item.toString()
        }
      </div>
    </div>
  );
}
