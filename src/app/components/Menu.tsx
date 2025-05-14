import React, { useState } from "react";
import DropDown from "./Dropdown";

const Menu: React.FC<{ onSelectOption: (option: string) => void }> = ({
  onSelectOption,
}): JSX.Element => {
  const [showDropDown, setShowDropDown] = useState<boolean>(false);
  const [selectOption, setSelectOption] = useState<string>("custom");
  const cities = () => {
    return ["Realistic", "Fantasy/ Surreal", "Abstract", "Animated", "custom"];
  };

  /**
   * Toggle the drop down menu
   */
  const toggleDropDown = () => {
    setShowDropDown(!showDropDown);
  };

  /**
   * Hide the drop down menu if click occurs
   * outside of the drop-down element.
   *
   * @param event  The mouse event
   */
  const dismissHandler = (event: React.FocusEvent<HTMLButtonElement>): void => {
    if (event.currentTarget === event.target) {
      setShowDropDown(false);
    }
  };

  /**
   * Callback function to consume the
   * city name from the child component
   *
   * @param city  The selected city
   */
  const optionSelection = (city: string): void => {
    setSelectOption(city);
    onSelectOption(city);
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
      <button
        className={`relative inline-flex items-center justify-center p-3 text-white bg-gradient-to-r from-black to-blue-600 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105`}
        onClick={(): void => toggleDropDown()}
        onBlur={(e: React.FocusEvent<HTMLButtonElement>): void =>
          dismissHandler(e)
        }
      >
        <div>{selectOption ? "Select: " + selectOption : "Select ..."} </div>
        {showDropDown && (
          <DropDown
            cities={cities()}
            showDropDown={false}
            toggleDropDown={(): void => toggleDropDown()}
            citySelection={optionSelection}
          />
        )}
      </button>
    </>
  );
};

export default Menu;
