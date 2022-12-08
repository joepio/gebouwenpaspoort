import "./Attributes.css";
import { useState } from "react";
import { Attribute, GBPObject } from "./schema";
import { Highlight } from "react-instantsearch-hooks-web";
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons'

interface DetailSectionProps {
  attribute: Attribute;
  hit: GBPObject;
}

/**
 * Renders a single section in the Details view, for one attribute.
 */
export function AttributeView({ attribute, hit }: DetailSectionProps) {
  const [open, setOpen] = useState(true);
  const toggleOpen = () => setOpen(!open);

  if (!attribute.id && !attribute.attributes) {
    return <PropValHighlights hit={hit} attribute={attribute} />;
  }

  const isCollection = attribute.id && attribute.attributes;

  const count = isCollection && hit[attribute?.id]?.length | 0;

  if (isCollection && count == 0 ) return null;

  return (
    <div className="Attribute">
      <div className="Attribute__title" onClick={toggleOpen}>
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />} {attribute.name} {isCollection && `(${count})`}
      </div>
      {open && (
        <div className={"Attribute__content"}>
          {isCollection ? (
            <AttributeCollection collection={attribute} hit={hit} />
          ) : (
            // The attribute represents an unidentified list of property-value combinations
            attribute.attributes.map((att) => (
              <PropValHighlights
                key={`${att.name} ${att.id}`}
                hit={hit}
                attribute={att}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AttributeCollection({ hit, collection }) {
  const items = hit[collection.id];
  if (!items) return null;
  return (
    <div className="Attribute__list">
      {items.map((item, i) => <AttributeItem key={`${item.id}${i}`} hit={hit} attribute={collection} item={item} collection={collection} i={i} />)}
    </div>
  );
}

function AttributeItem({ hit, attribute, item, collection, i }) {
  const [open, setOpen] = useState(false);

  const title = item[collection.attributes[0].id]

  return (
    <div className="Attribute__item" key={`${item.id}${i}`}>
      <h4 className="Attribute__item__title" onClick={() => setOpen(!open)}>{open ? <ChevronDownIcon /> : <ChevronRightIcon />}{title}</h4>
      {open && collection.attributes.map((attribute) => (
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
  return (
    <div className="Attribute__propval">
      <div className="Attribute__propval__key">{attribute.name}</div>
      <div className="Attribute__propval__value">
        <Highlight
          key={`val-${attribute.id}`}
          attribute={attribute.id}
          // @ts-ignore
          hit={hit}
          // @ts-ignore
          tagname="mark"
        />
      </div>
    </div>
  );
}

function PropVal({ item, attribute }) {
  if (!item) return null;
  return (
    <div className="Attribute__propval">
      <div className="Attribute__propval__key">{attribute.name}</div>
      <div className="Attribute__propval__value">{item.toString()}</div>
    </div>
  );
}