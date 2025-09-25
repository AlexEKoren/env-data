using System.ComponentModel;

namespace EnvDataApp.Models
{
    public class Pollutant : INotifyPropertyChanged
    {
        private string _name = string.Empty;
        private string _id = Guid.NewGuid().ToString();
        private bool _isAnnual = false;
        private bool _isShortTerm = false;
        private string _timeInterval = "24";
        private int _highValue = 1;

        public string Id
        {
            get => _id;
            set
            {
                _id = value;
                OnPropertyChanged(nameof(Id));
            }
        }

        public string Name
        {
            get => _name;
            set
            {
                _name = value;
                OnPropertyChanged(nameof(Name));
            }
        }

        public bool IsAnnual
        {
            get => _isAnnual;
            set
            {
                _isAnnual = value;
                OnPropertyChanged(nameof(IsAnnual));
            }
        }

        public bool IsShortTerm
        {
            get => _isShortTerm;
            set
            {
                _isShortTerm = value;
                OnPropertyChanged(nameof(IsShortTerm));
            }
        }

        public string TimeInterval
        {
            get => _timeInterval;
            set
            {
                _timeInterval = value;
                OnPropertyChanged(nameof(TimeInterval));
            }
        }

        public int HighValue
        {
            get => _highValue;
            set
            {
                _highValue = value;
                OnPropertyChanged(nameof(HighValue));
            }
        }

        public event PropertyChangedEventHandler? PropertyChanged;

        protected virtual void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
