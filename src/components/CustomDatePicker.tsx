import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { tr } from 'date-fns/locale/tr';
import { Calendar } from 'lucide-react';

registerLocale('tr', tr);

interface CustomDatePickerProps {
    selected: Date | null;
    onChange: (date: Date | null) => void;
    placeholderText?: string;
    showTimeSelect?: boolean;
    dateFormat?: string;
    required?: boolean;
}

const CustomDatePicker = ({ selected, onChange, placeholderText = "Tarih seçin", showTimeSelect = false, dateFormat = "dd.MM.yyyy", required = false }: CustomDatePickerProps) => {
    return (
        <div className="custom-datepicker-wrapper">
            <DatePicker
                selected={selected}
                onChange={onChange}
                locale="tr"
                dateFormat={dateFormat}
                showTimeSelect={showTimeSelect}
                placeholderText={placeholderText}
                className="input input-with-icon"
                required={required}
                isClearable
                timeCaption="Saat"
                popperPlacement="bottom-start"
                portalId="root-portal"
            />
            <Calendar size={18} className="datepicker-icon" />
        </div>
    );
};

export default CustomDatePicker;
