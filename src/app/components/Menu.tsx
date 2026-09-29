import React, { useState } from "react";
import DropDown from "./Dropdown";

const GENRES = [
  "Realistic",
  "Fantasy/ Surreal",
  "Abstract",
  "Animated",
  "custom",
];

const Menu: React.FC<{ onSelectOption: (option: string) => void }> = ({
  onSelectOption,
}): React.ReactElement => {
  const [showDropDown, setShowDropDown] = useState<boolean>(false);
  const [selectOption, setSelectOption] = useState<string>("custom");

  /**
   * Toggle the drop down menu
   */
  const toggleDropDown = () => {
    setShowDropDown(prev => !prev);
  };

  /**
   * Hide the drop down menu when focus leaves the menu entirely. Moving focus
   * between the trigger and the options must not dismiss it.
   *
   * @param event  The blur event
   */
  const dismissHandler = (event: React.FocusEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setShowDropDown(false);
    }
  };

  /**
   * Callback function to consume the
   * genre name from the child component
   *
   * @param genre  The selected genre
   */
  const optionSelection = (genre: string): void => {
    setSelectOption(genre);
    onSelectOption(genre);
    setShowDropDown(false);
  };

  return (
    <>
      <div className="announcement">
        <div>
          {selectOption
            ? `You selected the ${selectOption} genre`
            : "Select your image genre"}
        </div>
      </div>
      {/* The dropdown is a sibling of the trigger rather than a child of it:
          flow content is not valid inside a <button>, and rendering it there
          meant the trigger's blur removed the options before a click landed. */}
      <div className="relative inline-block" onBlur={dismissHandler}>
        <button
          type="button"
          className={`relative inline-flex items-center justify-center p-3 text-white bg-gradient-to-r from-black to-blue-600 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105`}
          onClick={(): void => toggleDropDown()}
          aria-haspopup="listbox"
          aria-expanded={showDropDown}
        >
          {selectOption ? "Select: " + selectOption : "Select ..."}
        </button>
        {showDropDown && (
          <DropDown options={GENRES} onSelect={optionSelection} />
        )}
      </div>
    </>
  );
};

export default Menu;
